import { Hono } from "hono";
import { runInitialSync } from "../sync/initial.js";
import { runIncrementalSync } from "../sync/incremental.js";

const tasks = new Hono();
let activeSync: Promise<void> | null = null;

tasks.post("/tasks/sync", async (c) => {
  try {
    const body = await c.req.json<{ mode?: string }>();
    console.log("Processing sync task:", body);

    if (activeSync) {
      return c.json({ error: "A sync is already running" }, 409);
    }

    let run: () => Promise<void>;
    if (body.mode === "full") {
      run = runInitialSync;
    } else if (!body.mode || body.mode === "incremental") {
      run = runIncrementalSync;
    } else {
      return c.json({ error: 'mode must be "full" or "incremental"' }, 400);
    }

    activeSync = run();
    await activeSync;

    return c.json({ status: "synced" }, 200);
  } catch (error) {
    console.error("Sync task failed:", error);
    return c.json({ error: "Sync failed" }, 500);
  } finally {
    activeSync = null;
  }
});

export default tasks;
