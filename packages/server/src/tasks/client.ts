import { CloudTasksClient } from "@google-cloud/tasks";
import { config } from "../config.js";

let tasksClient: CloudTasksClient | undefined;
let queuePath: string | undefined;

function getClient(): { client: CloudTasksClient; queuePath: string } {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }

  if (!queuePath) {
    if (
      !config.cloudTasks.projectId ||
      !config.cloudTasks.location ||
      !config.cloudTasks.queue
    ) {
      throw new Error(
        "Cloud Tasks configuration is missing. Set GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_TASKS_LOCATION, and GOOGLE_CLOUD_TASKS_QUEUE",
      );
    }
    queuePath = tasksClient.queuePath(
      config.cloudTasks.projectId,
      config.cloudTasks.location,
      config.cloudTasks.queue,
    );
  }

  return { client: tasksClient, queuePath };
}

export async function enqueueTask(payload: Record<string, unknown>) {
  const { client, queuePath } = getClient();

  if (!config.cloudTasks.handlerUrl) {
    throw new Error("GOOGLE_CLOUD_TASKS_HANDLER_URL is not set");
  }

  const body = Buffer.from(JSON.stringify(payload)).toString("base64");

  await client.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        httpMethod: "POST",
        url: config.cloudTasks.handlerUrl,
        headers: {
          "Content-Type": "application/json",
        },
        body,
      },
    },
  });
}
