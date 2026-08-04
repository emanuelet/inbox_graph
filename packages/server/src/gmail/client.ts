import { readFileSync } from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { Credentials } from "google-auth-library";

const TOKEN_STATE_KEY = "oauth_token";

const credentialsPath = path.join(process.cwd(), "credentials.json");
readFileSync(credentialsPath, "utf-8");

export const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri,
);

export const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export function getGmailClient() {
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function loadSavedToken() {
  try {
    const cursor = await db.query<{ tokens: string }>("RETURN DOCUMENT(@key)", {
      key: `state/${TOKEN_STATE_KEY}`,
    });
    const doc = await cursor.next();
    if (doc?.tokens) {
      const tokens = JSON.parse(doc.tokens) as Credentials;
      oauth2Client.setCredentials(tokens);
      return true;
    }
  } catch {
    // Token not found yet
  }
  return false;
}

export async function saveToken(tokens: Credentials) {
  await db.query(
    `
    UPSERT { _key: @key }
    INSERT { _key: @key, tokens: @tokens }
    UPDATE { tokens: @tokens }
    IN state
    `,
    { key: TOKEN_STATE_KEY, tokens: JSON.stringify(tokens) },
  );
}
