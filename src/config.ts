import dotenv from 'dotenv'

dotenv.config()

const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'ARANGO_URL',
  'ARANGO_DATABASE',
  'ARANGO_USERNAME',
  'ARANGO_PASSWORD',
] as const

const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar])
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

const env = process.env as Record<string, string>

export const config = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  },
  arango: {
    url: env.ARANGO_URL,
    database: env.ARANGO_DATABASE,
    username: env.ARANGO_USERNAME,
    password: env.ARANGO_PASSWORD,
  },
  cloudTasks: {
    projectId: env.GOOGLE_CLOUD_PROJECT,
    queue: env.GOOGLE_CLOUD_TASKS_QUEUE,
    location: env.GOOGLE_CLOUD_TASKS_LOCATION,
    handlerUrl: env.GOOGLE_CLOUD_TASKS_HANDLER_URL,
    topic: env.GOOGLE_CLOUD_TASKS_TOPIC,
  },
  server: {
    port: parseInt(env.PORT || '3000', 10),
  },
} as const
