import { App } from 'octokit'

const appId = '353840'
const privateKey = process.env.GH_APP_CLIENT_SECRET || ''

export const github = new App({ appId, privateKey })
