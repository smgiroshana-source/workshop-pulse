import { createClient } from "@supabase/supabase-js"

// Lazy-init: env vars are inlined at build time by Next.js.
// If not set during build, defer creation to runtime.
let _supabase = null
export const supabase = new Proxy({}, {
  get(_, prop) {
    if (!_supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error("Supabase env vars not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel project settings.")
      _supabase = createClient(url, key)
    }
    return _supabase[prop]
  }
})

const BUCKET = "job-photos"

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/"
}

// Compress image to target size (80-120kb) using canvas
async function compressImage(file, targetKB = 100) {
  // Skip non-image files
  if (!file.type?.startsWith("image/")) return file
  // Skip if already small enough
  if (file.size <= targetKB * 1024) return file

  return new Promise(async (resolve) => {
    // Try to get EXIF orientation via createImageBitmap (auto-corrects orientation in supported browsers)
    let bitmap = null
    try {
      if (typeof createImageBitmap === "function") {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
      }
    } catch { bitmap = null }

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement("canvas")
      let width = bitmap ? bitmap.width : img.width
      let height = bitmap ? bitmap.height : img.height

      // Scale down large images (max 1200px on longest side)
      const MAX = 1200
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      ctx.drawImage(bitmap || img, 0, 0, width, height)
      if (bitmap?.close) bitmap.close()

      // Binary search for quality that gives ~80-120kb
      let lo = 0.1, hi = 0.9, bestBlob = null
      const tryQuality = (q) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return }
          const sizeKB = blob.size / 1024
          if (sizeKB >= 70 && sizeKB <= 130) {
            resolve(blob)
          } else if (hi - lo < 0.05 || !bestBlob) {
            // Close enough or first attempt
            bestBlob = blob
            if (sizeKB > 130) {
              hi = q
              tryQuality((lo + hi) / 2)
            } else if (sizeKB < 70) {
              lo = q
              tryQuality((lo + hi) / 2)
            } else {
              resolve(blob)
            }
          } else {
            resolve(bestBlob)
          }
        }, "image/jpeg", q)
      }
      tryQuality(0.5)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// Upload a File or Blob to storage, return public URL
export async function uploadPhoto(file, path) {
  if (!navigator.onLine) throw new Error("OFFLINE: No internet connection")
  let compressed
  try {
    compressed = await compressImage(file)
  } catch (e) {
    throw new Error("COMPRESS_FAIL: Could not process image — try a different file")
  }
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    upsert: true,
    contentType: "image/jpeg",
  })
  if (error) {
    if (/bucket.*not.*found|404/i.test(error.message)) {
      throw new Error(`STORAGE_NOT_CONFIGURED: Storage bucket "${BUCKET}" not found in Supabase. Contact admin.`)
    }
    if (/exceeded|too large|payload/i.test(error.message)) {
      throw new Error("FILE_TOO_LARGE: Photo too large after compression")
    }
    if (/permission|denied|policy/i.test(error.message)) {
      throw new Error("PERMISSION_DENIED: Not allowed to upload — check Supabase RLS")
    }
    throw new Error(`UPLOAD_FAIL: ${error.message}`)
  }
  return getBaseUrl() + path
}

// Upload a base64 dataURL string to storage, return public URL
export async function uploadBase64Photo(dataUrl, path) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return uploadPhoto(blob, path)
}

// Compress and return data URL for local preview
export async function compressForPreview(file) {
  const compressed = await compressImage(file)
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(compressed)
  })
}

// ── Signed URLs for a PRIVATE bucket ─────────────────────────────────────────
// Photos are stored (inside job/store JSON) as public-style bucket URLs. Once the
// bucket is made private those URLs 403, so renders go through resolvePhotoUrl():
// storage URLs are exchanged for a signed URL (cached until near expiry), and
// data:/blob:/foreign URLs pass through untouched. While the bucket is still
// public, the signed URL works the same — so this is safe to ship first and
// flip the bucket after.
const PUBLIC_MARKER = "/storage/v1/object/public/" + BUCKET + "/"
const SIGN_TTL = 60 * 60 // 1 hour
const signedCache = new Map() // path → { url, expiresAt }

export function storagePathFromUrl(url) {
  if (typeof url !== "string") return null
  const idx = url.indexOf(PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + PUBLIC_MARKER.length).split("?")[0])
}

export async function resolvePhotoUrl(url) {
  const path = storagePathFromUrl(url)
  if (!path) return url // data URL, blob, or non-storage URL — use as-is
  const cached = signedCache.get(path)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL)
    if (error || !data?.signedUrl) return url // fall back (works while bucket is public)
    signedCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGN_TTL * 1000 })
    return data.signedUrl
  } catch {
    return url
  }
}

// Delete a photo by its public URL (no-op if it's not a storage URL)
export async function deletePhoto(url) {
  if (!url || !url.includes("/storage/v1/object/public/" + BUCKET + "/")) return
  const path = url.split("/storage/v1/object/public/" + BUCKET + "/")[1]
  await supabase.storage.from(BUCKET).remove([path])
}
