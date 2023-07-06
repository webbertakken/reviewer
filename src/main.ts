// import { updateInstances } from './logic/update-instances'
// import { github } from './services/github'
// import { gpt } from './services/gpt'
import { checkEnv } from './logic/check-env'

export const main = async () => {
  if (!checkEnv()) return

  console.log('Hello World')

  // List instances
  // await updateInstances(github)
  // console.log(gpt)
}
