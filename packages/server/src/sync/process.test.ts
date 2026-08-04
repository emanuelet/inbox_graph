import assert from "node:assert/strict";
import test from "node:test";
import { buildMessageEdges } from "./process.js";

test("buildMessageEdges uses stable keys and deduplicates recipients", () => {
  const edges = buildMessageEdges({
    messageId: "message-1",
    threadId: "thread-1",
    from: { name: "Sender", email: "sender@example.com" },
    to: [
      { name: "Recipient", email: "recipient@example.com" },
      { name: "Recipient again", email: "recipient@example.com" },
    ],
    cc: [{ name: "CC", email: "cc@example.com" }],
  });

  assert.equal(edges.sentBy.length, 1);
  assert.equal(edges.receivedBy.length, 2);
  assert.equal(edges.inThread.length, 1);
  assert.equal(new Set(edges.receivedBy.map((edge) => edge._key)).size, 2);
  assert.ok(edges.sentBy[0]._key);
});
