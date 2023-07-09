import { GitHub } from '../services/GitHub.mjs'
import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'
import { dedent } from 'ts-dedent'
import { Config } from '../config/config.mjs'
import { Gpt } from '../services/Gpt.mjs'
import { RepositoryContext } from './RepositoryContext.mjs'

type Suggestions = {
  description: string
  code: string[]
}

export const createPullRequestActions = (
  event: EmitterWebhookEvent<'pull_request'>,
  config: Config,
  gh: GitHub,
  gpt: Gpt,
) => {
  const { verbose } = config.app
  const { number } = event.payload.pull_request
  const repository = RepositoryContext.fromPayloadRepo(event.payload.repository)

  console.log(`PR #${number}`)

  const suggestions: Suggestions = {
    description: '',
    code: [],
  }

  return {
    suggestions,

    async reviewTitleAndDescription() {
      const { title, body } = event.payload.pull_request
      if (title.length < 10) {
        suggestions.description = "The title isn't very descriptive."
      } else if (!body || body.length < 100) {
        suggestions.description = 'The description could be more helpful.'
      }

      console.log('reviewTitleAndDescription')
    },

    async reviewCodeChanges() {
      if (verbose) console.log('reviewCodeChanges')

      // Gather information about the PR
      if (verbose) console.log(`Fetching changed files for #${number}...`)
      const changedFiles = await gh.getPrChangedFiles(number)
      console.log(changedFiles.length + ` files were updated in ${repository}#${number}`)

      // Get input from GPT
      console.log('Asking GPT to help review the PR...')
      const prompt =
        `please make suggestions on idiomatic improvements and find better code: `.concat(
          changedFiles.map((file) => file.patch).join('\n\n'),
        )
      const chatMessage = await gpt.ask(prompt)
      const gptAnswer = chatMessage.text

      if (!gptAnswer) throw Error('GPT did not return any answer.')
      if (verbose) console.log(`GPT answered:\n${gptAnswer}`)

      suggestions.code.push(gptAnswer)
    },

    async placeOrUpdateComment() {
      console.log('placeOrUpdateComment')

      const feedback: string[] = []

      if (suggestions.code.length >= 1) {
        const mostImportantComments = suggestions.code.slice(0, 3)
        feedback.push(dedent`
        <ul>
          ${mostImportantComments.map((comment) => `<li>${comment}</li>`).join('\n')}
        </ul>`)
      }

      if (suggestions.description) {
        feedback.push(`<p>${suggestions.description}</p>`)
      }

      if (feedback.length === 0) {
        feedback.push(`<p>Everything looks good!</p>`)
      }
      const comment = dedent`
      ## :wave: Hi there!

      ${feedback.join('\n\n')}

      <sub><sup>
      Automatically generated with the help of ${config.model.name} v${config.model.version}.
      Feedback? Please don't hesitate to drop me an email at [webber@takken.io](mailto:webber@takken.io).
      </sup></sub>
      `

      // Todo - debug access, in theory the code should work, but then stopped when upgrading to pkcs8 key
      console.log('before 11')
      const prReviews = await gh.getCommentsByUser(number, config.gitHub.app.handle)
      console.log('after 11')
      if (prReviews.length === 0) {
        console.log(`Submiting review for the first time at PR #${number}.`)
        await gh.placeComment(number, comment)
        return
      }

      // TODO - check if the bot review is the most recent
      console.log(`Updating review for PR #${number}.`)
      await gh.updateComment(prReviews[0].id, comment)

      console.log('Done!')

      return comment
    },
  }
}
