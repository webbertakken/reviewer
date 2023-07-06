// import { updateInstances } from './logic/update-instances'
import { GithubApi } from './services/github-api'
// import { gpt } from './services/gpt'
import { checkEnv } from './logic/check-env'

export const main = async () => {
  if (!checkEnv()) return

  console.log('Hello World')

  const ghAppClientSecret = process.env.GH_APP_CLIENT_SECRET
  const ghApi = new GithubApi({
    repoName: 'reviewer',
    repoOwner: 'webbertakken',
    installationId: '39090441',
    appId: '353840',
    privateKey: ghAppClientSecret || '',
  })

  try {
    const result = await ghApi.getFileChanges(4)
    console.log(result)
  } catch (error) {
    console.error('Error fetching pull request information:', error)
  }
  // List instances
  // await updateInstances(github)
  // console.log(gpt)
}
