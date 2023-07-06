import { App as GitHubApp } from 'octokit'
import { config } from '../config/config.mjs'

export class App {
  private readonly client: GitHubApp

  constructor() {
    const { appId, privateKey } = config.gitHub.app

    this.client = new GitHubApp({ appId, privateKey })
  }
}
