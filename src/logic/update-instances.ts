import { App } from 'octokit'

export const updateInstances = async (app: App) => {
  for await (const { octokit, repository } of app.eachRepository.iterator()) {
    // https://docs.github.com/en/rest/reference/repos#create-a-repository-dispatch-event
    await octokit.rest.repos.createDispatchEvent({
      owner: repository.owner.login,
      repo: repository.name,
      event_type: 'my_event',
      client_payload: {
        foo: 'bar',
      },
    })
    console.log('Event distpatched for %s', repository.full_name)
  }
}
