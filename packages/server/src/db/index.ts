import { Database } from "arangojs";
import { config } from "../config.js";

export const db = new Database({
  url: config.arango.url,
  databaseName: config.arango.database,
  precaptureStackTraces: true,
});

db.useBasicAuth(config.arango.username, config.arango.password);
