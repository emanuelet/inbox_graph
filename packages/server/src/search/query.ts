export interface SearchFilters {
  from?: string;
  to?: string;
  subject?: string;
  after?: number;
  before?: number;
  hasAttachment?: boolean;
}

export interface ParsedSearchQuery {
  terms: string[];
  phrases: string[];
  filters: SearchFilters;
}

function parseDate(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const terms: string[] = [];
  const phrases: string[] = [];
  const filters: SearchFilters = {};
  const tokens = query.match(/"[^"]*"|\S+/g) || [];

  for (const token of tokens) {
    if (token.startsWith('"') && token.endsWith('"')) {
      const phrase = token.slice(1, -1).trim();
      if (phrase) phrases.push(phrase);
      continue;
    }

    const separator = token.indexOf(":");
    if (separator > 0) {
      const key = token.slice(0, separator).toLowerCase();
      const value = token.slice(separator + 1);
      if (key === "from" && value) {
        filters.from = value.toLowerCase();
        continue;
      }
      if (key === "to" && value) {
        filters.to = value.toLowerCase();
        continue;
      }
      if (key === "subject" && value) {
        filters.subject = value;
        continue;
      }
      if ((key === "after" || key === "before") && value) {
        const date = parseDate(value);
        if (date !== undefined) {
          filters[key] = date;
          continue;
        }
      }
      if (key === "has" && value === "attachment") {
        filters.hasAttachment = true;
        continue;
      }
    }

    terms.push(token);
  }

  return { terms, phrases, filters };
}
