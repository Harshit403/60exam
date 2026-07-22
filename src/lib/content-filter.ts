const BLOCKED_TERMS = ['instagram', 'telegram', 'whatsapp', 'facebook', 'twitter', 'tiktok', 'snapchat', 'discord', 'youtube']

export function filterContent(text: string): string {
  let filtered = text
  BLOCKED_TERMS.forEach(term => {
    const regex = new RegExp(term, 'gi')
    filtered = filtered.replace(regex, '***')
  })
  return filtered
}

export function hasBlockedContent(text: string): boolean {
  return BLOCKED_TERMS.some(term => new RegExp(term, 'gi').test(text))
}
