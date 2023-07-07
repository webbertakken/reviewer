import { GitHub } from '../services/GitHub.mjs'
import { Gpt } from '../services/Gpt.mjs'
import { beHelpfulOnMergeRequest } from './beHelpfulOnMergeRequest.mjs'

export const beHelpfulOnMostRecentPullRequest = async () => {
  try {
    console.log('Authenticating with Github...')
    const github = new GitHub('webbertakken', 'reviewer')

    console.log('Authenticating with OpenAI...')
    const gpt = new Gpt()

    // Select a PR to review
    console.log(`Fetching most recent PR...`)
    const pr = await github.getMostRecentPr()
    if (!pr) {
      console.log('No open pull requests found')
      return
    }

    await beHelpfulOnMergeRequest(pr.number)
  } catch (error) {
    console.error('Error fetching pull request information:', error)
  }
}
