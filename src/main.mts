// import { updateInstances } from './logic/update-instances.mjs'
import { GithubApi } from './services/github-api.mjs'
import { Gpt } from './services/gpt.mjs'
import { checkEnv } from './logic/check-env.mjs'

export const main = async () => {
  if (!checkEnv()) return

  const ghApi = new GithubApi({
    repoName: 'reviewer',
    repoOwner: 'webbertakken',
    installationId: '39090441',
    appId: '353840',
    privateKey: process.env.GH_APP_CLIENT_SECRET || '',
  })

  try {
    console.log(`Fetching most recent pull request...`)
    const recentPullRequest = await ghApi.getMostRecentPullRequest()

    console.log(
      `Fetching file contents and patches for pull request #${recentPullRequest.number}...`,
    )
    const result = await ghApi.getFileChanges(recentPullRequest.number)

    console.log(result)
  } catch (error) {
    console.error('Error fetching pull request information:', error)
  }

  const response = (await Gpt.init()).sendMessage('Hello World')
}
