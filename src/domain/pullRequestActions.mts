import { GitHub } from '../services/GitHub.mjs'
import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'
import { config } from '../config/config.mjs'
import { dedent } from 'ts-dedent'
import { getSuggestionsForPullRequest } from './getSuggestionsForPullRequest.mjs'

type Suggestions = {
  description: string
  code: string[]
}

export const pullRequestActions = (event: EmitterWebhookEvent<'pull_request'>) => {
  const { number } = event.payload.pull_request

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
      console.log('reviewCodeChanges')
      const rawMessage = await getSuggestionsForPullRequest(number)
      suggestions.code.push(rawMessage)
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

      const prReviews = await GitHub.getInstance().getCommentsByUser(
        number,
        config.gitHub.app.handle,
      )
      if (prReviews.length === 0) {
        console.log(`Submiting review for the first time at PR #${number}.`)
        // await github.placeComment(number, comment)
        return
      }

      // TODO - check if the bot review is the most recent
      console.log(`Updating review for PR #${number}.`)
      // await github.updateComment(prReviews[0].id, comment)

      console.log('Done!')

      return comment
    },
  }
}
