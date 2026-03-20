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

// Upload a File or Blob to storage, return public URL
export async function uploadPhoto(file, path) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  })
  if (error) throw error
  return getBaseUrl() + path
}

// Upload a base64 dataURL string to storage, return public URL
export async function uploadBase64Photo(dataUrl, path) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return uploadPhoto(blob, path)
}

// Delete a photo by its public URL (no-op if it's not a storage URL)
export async function deletePhoto(url) {
  if (!url || !url.includes("/storage/v1/object/public/" + BUCKET + "/")) return
  const path = url.split("/storage/v1/object/public/" + BUCKET + "/")[1]
  await supabase.storage.from(BUCKET).remove([path])
}
