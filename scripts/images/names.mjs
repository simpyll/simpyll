export function slug(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72).replace(/-$/, '')
}
export function imageName({ name, caption, alt, filename, article = 'article', sequence = 1 }) {
  const meaningful = value => {
    const s = slug(value)
    return s && !/^(?:[a-f0-9-]{20,}|(?:image|img|photo|screenshot)-?\d{6,})$/.test(s) ? s : ''
  }
  return [name, caption, alt, filename?.replace(/\.[^.]+$/, '')].map(meaningful).find(Boolean) || `${slug(article) || 'article'}-image-${String(sequence).padStart(2, '0')}`
}
