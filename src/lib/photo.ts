const DRIVE_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
  /[?&]id=([a-zA-Z0-9_-]{10,})/,
  /\/d\/([a-zA-Z0-9_-]{10,})/,
]

export function extractDriveFileId(url: string): string | null {
  for (const pattern of DRIVE_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function photoSrc(rawUrl: string | null, size = 500): string | null {
  if (!rawUrl) return null
  const fileId = extractDriveFileId(rawUrl)
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
  }
  return rawUrl
}
