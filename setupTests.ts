import { config } from 'dotenv'

// .env file is used to configure wrangler,
// .dev.vars is used to configure the worker itself
config({ path: './.dev.vars' })
