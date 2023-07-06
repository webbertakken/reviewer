import 'dotenv/config'
import { hasCorrectConfig } from './config/hasCorrectConfig.mjs'
import { beHelpfulOnEarliestPullRequest } from './domain/beHelpfulOnEarliestPullRequest.mjs'

const app = async () => {
  if (!hasCorrectConfig()) return

  await beHelpfulOnEarliestPullRequest()
}

app().catch((error) => {
  console.error(error)
  process.exit(1)
})
