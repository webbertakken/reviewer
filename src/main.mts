// import { updateInstances } from './logic/update-instances.mjs'
import { checkEnv } from './logic/check-env.mjs'
import { beHelpfulOnAPullRequest } from './beHelpfulOnAPullRequest.mjs'

export const main = async () => {
  if (!checkEnv()) return

  await beHelpfulOnAPullRequest()
}
