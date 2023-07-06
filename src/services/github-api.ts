import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

<<<<<<< HEAD:src/services/github-api.ts
type GithubApiConfig = {
  repoName: string
  repoOwner: string
  installationId: string
  appId: string
  privateKey: string
}

export class GithubApi {
  app: any
  token: string
  repoName: string
  repoOwner: string

  // Authenticates and stores token
  constructor({ repoName, repoOwner, installationId, appId, privateKey }: GithubApiConfig) {
    this.repoName = repoName
    this.repoOwner = repoOwner
    this.token = ''
=======
type Props = {
  repoName: string;
  repoOwner: string;
  installationId: string;
  appId: string;
  privateKey: string;
};

export class GithubApp {
  app: any;
  token: string;
  repoName: string;
  repoOwner: string;

  // Authenticates and stores token
  constructor({ repoName, repoOwner, installationId, appId, privateKey }: Props) {
    this.repoName = repoName;
    this.repoOwner = repoOwner;
    this.token = '';
>>>>>>> wip:src/modules/github-app.ts
    this.app = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: parseInt(appId, 10),
        privateKey,
        // optional: this will make appOctokit authenticate as app (JWT)
        //           or installation (access token), depending on the request URL
        installationId: parseInt(installationId, 10),
      },
    })
  }

  // async install() {
  //   const { token } = await this.app.auth({
  //     type: 'installation',
  //     // defaults to `options.auth.installationId` set in the constructor
  //     // installationId: 123,
  //   });
  //   this.token = token;
  // }

  async getPullRequestInfo(pullRequestNumber: number) {
    try {
      const response = await this.app.pulls.get({
        owner: this.repoOwner,
        repo: this.repoName,
        pull_number: pullRequestNumber,
      })

      return response.data
    } catch (error) {
      console.error('Error fetching pull request information:', error)
      throw error
    }
  }

  // Function to fetch file changes from a pull request
  async getFileChanges(pullRequestNumber: number) {
    try {
      const response = await this.app.pulls.listFiles({
        owner: this.repoOwner,
        repo: this.repoName,
        pull_number: pullRequestNumber,
      })

      const files = response.data.map((file: any) => file.filename)
      return files
    } catch (error) {
      console.error('Error fetching file changes:', error)
      throw error
    }
  }
}
