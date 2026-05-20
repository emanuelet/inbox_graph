export function safeBase64(str: string): string {
  return Buffer.from(str.toLowerCase()).toString('base64url')
}

export function extractHeader(
  headers: Array<{ name: string; value: string }>,
  name: string,
): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}

export function parseAddresses(headerValue: string): string[] {
  if (!headerValue) return []
  const addresses: string[] = []
  const regex = /[\w.-]+@[\w.-]+\.\w+/g
  let match = regex.exec(headerValue)
  while (match !== null) {
    addresses.push(match[0].toLowerCase())
    match = regex.exec(headerValue)
  }
  return [...new Set(addresses)]
}

export function extractNameAndEmail(headerValue: string): Array<{ name: string; email: string }> {
  if (!headerValue) return []
  const results: Array<{ name: string; email: string }> = []
  const regex = /(?:"?([^"<]*)"?\s*<([^>]+)>|([\w.-]+@[\w.-]+\.\w+))/g
  let match = regex.exec(headerValue)
  while (match !== null) {
    const name = (match[1] || '').trim() || undefined
    const email = (match[2] || match[3] || '').toLowerCase()
    if (email) {
      results.push({ name: name || email, email })
    }
    match = regex.exec(headerValue)
  }
  return results
}
