import { GitHub } from '../services/GitHub.mjs'
import { Gpt } from '../services/Gpt.mjs'

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

    // Gather information about the PR
    console.log(`Fetching changed files for #${pr.number}...`)
    const changedFiles = await github.getPrChangedFiles(pr.number)
    console.log(changedFiles.length + ' files were updated.')

    // Get input from GPT
    console.log('Asking GPT to help review the PR...')
    const prompt = `please code review the following snippets: `.concat(
      changedFiles.map((file) => file.contents).join('\n\n'),
    )
    const response = await gpt.ask(prompt)

    // Todo - parse input into something post-worthy

    // Todo - post a comment on the PR
    console.log(response)
  } catch (error) {
    console.error('Error fetching pull request information:', error)
  }
}
