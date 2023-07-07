import { EmitterWebhookEvent } from '@octokit/webhooks/dist-types/types.js'
import { config } from '../config/config.mjs'
import { dedent } from 'ts-dedent'

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

      suggestions.code.push(
        'Suggested change 1',
        'Suggested change 2',
        'Suggested change 3',
        'Suggested change 4',
        'Suggested change 5',
      )
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

      console.log(comment)
      return comment
    },
  }
}
