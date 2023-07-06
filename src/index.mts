import 'dotenv/config'
import { checkEnv } from './config/checkEnv.mjs'
import { beHelpfulOnAPullRequest } from './domain/beHelpfulOnAPullRequest.mjs'

const app = async () => {
  if (!checkEnv()) return

  await beHelpfulOnAPullRequest()
}

app().catch((error) => {
  console.error(error)
  process.exit(1)
})
