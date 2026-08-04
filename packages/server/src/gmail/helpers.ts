export function safeBase64(str: string): string {
  return Buffer.from(str.toLowerCase()).toString("base64url");
}

interface MimePart {
  mimeType?: string | null;
  filename?: string | null;
  body?: { data?: string | null; attachmentId?: string | null };
  parts?: MimePart[];
}

export function hasAttachment(payload: MimePart): boolean {
  if (payload.filename && payload.body?.attachmentId) return true;
  return (payload.parts || []).some(hasAttachment);
}

export function extractBodyText(payload: MimePart): string {
  const plainTexts: string[] = [];
  const htmlTexts: string[] = [];

  const visit = (part: MimePart) => {
    if (part.body?.data && part.mimeType?.startsWith("text/")) {
      const decoded = Buffer.from(part.body.data, "base64url").toString("utf-8");
      if (part.mimeType === "text/plain") plainTexts.push(decoded);
      if (part.mimeType === "text/html") {
        htmlTexts.push(decoded.replace(/<[^>]*>/g, " "));
      }
    }

    for (const child of part.parts || []) visit(child);
  };

  visit(payload);
  return (plainTexts.length > 0 ? plainTexts : htmlTexts)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHeader(
  headers: Array<{ name: string; value: string }>,
  name: string,
): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

export function parseAddresses(headerValue: string): string[] {
  if (!headerValue) return [];
  const addresses: string[] = [];
  const regex = /[\w.-]+@[\w.-]+\.\w+/g;
  let match = regex.exec(headerValue);
  while (match !== null) {
    addresses.push(match[0].toLowerCase());
    match = regex.exec(headerValue);
  }
  return [...new Set(addresses)];
}

export function extractNameAndEmail(
  headerValue: string,
): Array<{ name: string; email: string }> {
  if (!headerValue) return [];
  const results: Array<{ name: string; email: string }> = [];
  const regex =
    /(?:"?([^"<]*)"?\s*<([^>]+)>|([\w.-]+@[\w.-]+\.\w+))/g;
  let match = regex.exec(headerValue);
  while (match !== null) {
    const name = (match[1] || "").trim() || undefined;
    const email = (match[2] || match[3] || "").toLowerCase();
    if (email) {
      results.push({ name: name || email, email });
    }
    match = regex.exec(headerValue);
  }
  return results;
}
