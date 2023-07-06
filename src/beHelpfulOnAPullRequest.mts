import { GitHub } from './logic/github.mjs'
import { Gpt } from './services/gpt.mjs'

export const beHelpfulOnAPullRequest = async () => {
  try {
    const github = new GitHub({
      repoName: 'reviewer',
      repoOwner: 'webbertakken',
    })

    console.log(`Fetching most recent pull request...`)
    const recentPullRequest = await github.getMostRecentPullRequest()

    console.log(
      `Fetching file contents and patches for pull request #${recentPullRequest.number}...`,
    )
    const result = await github.getFileChanges(recentPullRequest.number)

    console.log(result.length + ' files updated')

    const prompt = `please code review the following snippets:
  `.concat(result.map((file) => file.content).join('\n\n'))
    const response = await (await Gpt.init()).sendMessage('Hello lovely robot!' + prompt)

    console.log(response)
  } catch (error) {
    console.error('Error fetching pull request information:', error)
  }
}