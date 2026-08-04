import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchQuery } from "./query.js";

test("parseSearchQuery separates terms, phrases, and Gmail-style filters", () => {
  assert.deepEqual(
    parseSearchQuery('quarterly forecast "renewal proposal" from:sam@example.com after:2025-01-01 has:attachment'),
    {
      terms: ["quarterly", "forecast"],
      phrases: ["renewal proposal"],
      filters: {
        from: "sam@example.com",
        after: Date.UTC(2025, 0, 1),
        hasAttachment: true,
      },
    },
  );
});

test("parseSearchQuery rejects invalid dates and unsupported filters as regular terms", () => {
  assert.deepEqual(parseSearchQuery("after:not-a-date label:finance"), {
    terms: ["after:not-a-date", "label:finance"],
    phrases: [],
    filters: {},
  });
});
