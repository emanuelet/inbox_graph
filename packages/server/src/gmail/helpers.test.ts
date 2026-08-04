import assert from "node:assert/strict";
import test from "node:test";
import { extractBodyText, hasAttachment } from "./helpers.js";

test("extractBodyText finds text/plain at arbitrary MIME depth", () => {
  const encoded = Buffer.from("Deeply nested message body").toString("base64url");

  assert.equal(
    extractBodyText({
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "multipart/related",
              parts: [{ mimeType: "text/plain", body: { data: encoded } }],
            },
          ],
        },
      ],
    }),
    "Deeply nested message body",
  );
});

test("hasAttachment ignores inline message text and finds nested attachments", () => {
  assert.equal(
    hasAttachment({
      mimeType: "multipart/mixed",
      parts: [
        { mimeType: "text/plain", body: { data: "body" } },
        {
          mimeType: "multipart/related",
          parts: [
            {
              filename: "invoice.pdf",
              body: { attachmentId: "attachment-1" },
            },
          ],
        },
      ],
    }),
    true,
  );
});
