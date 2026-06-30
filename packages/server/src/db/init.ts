import { db } from "./index.js";

const DOCUMENT_COLLECTIONS = ["messages", "threads", "people", "state"] as const;
const EDGE_COLLECTIONS = ["sent_by", "received_by", "in_thread"] as const;

async function ensureCollection(name: string, type: "document" | "edge") {
  const collections = await db.listCollections();
  const exists = collections.some((c) => c.name === name);

  if (exists) {
    console.log(`Collection "${name}" already exists`);
    return;
  }

  if (type === "document") {
    await db.createCollection(name);
    console.log(`Created document collection "${name}"`);
  } else {
    await db.createCollection(name, { type: 3 });
    console.log(`Created edge collection "${name}"`);
  }
}

async function ensureSearchView() {
  const viewName = "email_search";
  const views = await db.listViews();
  const exists = views.some((v) => v.name === viewName);

  if (exists) {
    console.log(`View "${viewName}" already exists`);
    return;
  }

  await db.createView(viewName, {
    type: "arangosearch",
    links: {
      messages: {
        fields: {
          subject: { analyzers: ["text_en"] },
          snippet: { analyzers: ["text_en"] },
          bodyText: { analyzers: ["text_en"] },
        },
      },
      people: {
        fields: {
          name: { analyzers: ["text_en"] },
          email: { analyzers: ["text_en"] },
        },
      },
    },
  });

  console.log(`Created ArangoSearch view "${viewName}"`);
}

export async function initDb() {
  console.log("Initializing ArangoDB infrastructure...");

  for (const name of DOCUMENT_COLLECTIONS) {
    await ensureCollection(name, "document");
  }

  for (const name of EDGE_COLLECTIONS) {
    await ensureCollection(name, "edge");
  }

  await ensureSearchView();

  console.log("ArangoDB initialization complete");
}
