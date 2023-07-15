import { config } from 'dotenv'

// .env file is used to configure wrangler,
// .dev.vars is used to configure the worker itself
config({ path: process.env.CI ? '.dev.vars.dist' : '.dev.vars' })
