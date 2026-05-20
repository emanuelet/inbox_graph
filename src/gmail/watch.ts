import { config } from '../config.js'
import { getGmailClient } from './client.js'

export async function setupGmailWatch() {
  if (!config.cloudTasks.projectId || !config.cloudTasks.topic) {
    console.log('Cloud Tasks Pub/Sub topic not configured. Skipping gmail.watch() setup.')
    return
  }

  const gmail = getGmailClient()

  try {
    await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: `projects/${config.cloudTasks.projectId}/topics/${config.cloudTasks.topic}`,
      },
    })
    console.log('Gmail watch established successfully')
  } catch (error) {
    console.error('Failed to establish Gmail watch:', error)
  }
}
