import { GitHub } from '../services/GitHub.mjs'
import { Gpt } from '../services/Gpt.mjs'

export const beHelpfulOnEarliestPullRequest = async () => {
  try {
    console.log('Authenticating with Github...')
    const github = new GitHub('webbertakken', 'reviewer')

    console.log('Authenticating with OpenAI...')
    const gpt = new Gpt()

    console.log(`Fetching most recent PR...`)
    const pr = await github.getMostRecentPr()
    if (!pr) {
      console.log('No open pull requests found')
      return
    }

    console.log(`Fetching changed files for #${pr.number}...`)
    const changedFiles = await github.getPrChangedFiles(pr.number)
    console.log(changedFiles.length + ' files were updated.')

    console.log('Asking GPT to help review the PR...')
    const prompt = `please code review the following snippets: `.concat(
      changedFiles.map((file) => file.contents).join('\n\n'),
    )
    const response = await gpt.ask(prompt)

    // Todo - parse the response into something post worthy
    console.log(response)
    console.log(response.detail?.choices)
  } catch (error) {
    console.error('Error fetching pull request information:', error)
  }
}
