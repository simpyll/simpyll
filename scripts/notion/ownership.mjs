// Shared source-path allowlist for publishing and offline recovery.
export function ownedPath(path) {
  return /^src\/content\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(path) || /^public\/images\/notion\/[a-f0-9]{32}\/(?:[a-f0-9]{64}|[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{12})\.(png|jpg|gif|webp|avif)$/.test(path)
}
