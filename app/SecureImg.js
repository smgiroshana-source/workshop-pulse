"use client"
import { useEffect, useState } from "react"
import { resolvePhotoUrl } from "./supabase"

// Drop-in <img> replacement for photos that may live in the (private) storage
// bucket. Storage URLs are swapped for signed URLs; data:/blob:/other URLs
// render unchanged. Starts with the raw src so nothing flashes while signing.
export default function SecureImg({ src, ...props }) {
  const [url, setUrl] = useState(src)
  useEffect(() => {
    let live = true
    setUrl(src)
    resolvePhotoUrl(src).then(u => { if (live && u) setUrl(u) })
    return () => { live = false }
  }, [src])
  if (!url) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={url} />
}
