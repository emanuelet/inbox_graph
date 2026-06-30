export function safeBase64(str: string): string {
  return Buffer.from(str.toLowerCase()).toString("base64url");
}

export function extractBodyText(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{
    mimeType?: string;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  }>;
}): string {
  const texts: string[] = [];

  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    if (payload.mimeType === "text/plain") {
      texts.push(decoded);
    } else if (payload.mimeType === "text/html") {
      texts.push(decoded.replace(/<[^>]*>/g, ""));
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        texts.push(Buffer.from(part.body.data, "base64url").toString("utf-8"));
      } else if (part.mimeType === "text/html" && part.body?.data) {
        texts.push(Buffer.from(part.body.data, "base64url").toString("utf-8").replace(/<[^>]*>/g, ""));
      } else if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === "text/plain" && sub.body?.data) {
            texts.push(Buffer.from(sub.body.data, "base64url").toString("utf-8"));
          } else if (sub.mimeType === "text/html" && sub.body?.data) {
            texts.push(Buffer.from(sub.body.data, "base64url").toString("utf-8").replace(/<[^>]*>/g, ""));
          }
        }
      }
    }
  }

  return texts.join("\n").replace(/\s+/g, " ").trim();
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
