import { GitHub } from '../services/GitHub.mjs'
import { Gpt } from '../services/Gpt.mjs'
import { config } from '../config/config.mjs'

// Given a merge reuqest number, it will post a comment on the PR
// with a review of the changes only if the bot has not already
export const beHelpfulOnMergeRequest = async (prNumber: number) => {
  try {
    console.log('Authenticating with Github...')
    const github = new GitHub('webbertakken', 'reviewer')

    console.log('Authenticating with OpenAI...')
    const gpt = new Gpt()

    const prReviews = await github.getCommentsByUser(prNumber, config.gitHub.app.handle)

    // Gather information about the PR
    console.log(`Fetching changed files for #${prNumber}...`)
    const changedFiles = await github.getPrChangedFiles(prNumber)
    console.log(changedFiles.length + ' files were updated.')

    // Get input from GPT
    console.log('Asking GPT to help review the PR...')
    const prompt =
      `please make suggestions on idiomatic improvements and find better code: `.concat(
        changedFiles.map((file) => file.patch).join('\n\n'),
      )
    const chatMessage = await gpt.ask(prompt)
    const gptAnswer = chatMessage.text
    console.log(`GPT answered:\n${gptAnswer}`)
    if (!gptAnswer) {
      throw Error('GPT did not return any answer.')
    }

    if (prReviews.length === 0) {
      console.log(`Submiting review for the first time at PR #${prNumber}.`)
      await github.placeComment(prNumber, gptAnswer)
      return
    }

    // TODO - check if the bot review is the most recent
    console.log(`Updating review for PR #${prNumber}.`)
    await github.updateComment(prReviews[0].id, gptAnswer)

    console.log('Done!')
  } catch (error) {
    console.error('Error fetching pull request information:', error)
  }
}
