import { GitHub } from '../services/GitHub.mjs'
import { Gpt } from '../services/Gpt.mjs'

export const getSuggestionsForPullRequest = async (
  prNumber: number,
  gh: GitHub,
  gpt: Gpt,
): Promise<string> => {
  // Gather information about the PR
  console.log(`Fetching changed files for #${prNumber}...`)
  const changedFiles = await gh.getPrChangedFiles(prNumber)
  console.log(changedFiles.length + ' files were updated.')

  // Get input from GPT
  console.log('Asking GPT to help review the PR...')
  const prompt = `please make suggestions on idiomatic improvements and find better code: `.concat(
    changedFiles.map((file) => file.patch).join('\n\n'),
  )
  const chatMessage = await gpt.ask(prompt)
  const gptAnswer = chatMessage.text

  console.log(`GPT answered:\n${gptAnswer}`)

  if (!gptAnswer) {
    throw Error('GPT did not return any answer.')
  }

  return gptAnswer
}
