export interface Env {
  MOCK_GPT: 'true' | 'false' | undefined
  APP_VERBOSE: 'true' | 'false' | undefined
  GPT_DEBUG: 'true' | 'false' | undefined
  OPENAI_API_KEY: string
  GH_APP_CLIENT_SECRET: string
  GH_APP_SECRET_TOKEN: string
  GH_APP_PRIVATE_KEY: string
  SENTRY_DSN: string
  ENVIRONMENT: 'local' | 'feature' | 'staging' | 'beta' | 'production'
  MODE: 'production' | 'development'
}
