export class RepositoryContext {
  readonly owner: string
  readonly repo: string

  constructor(owner: string, repo: string) {
    this.owner = owner
    this.repo = repo
  }

  toString(): string {
    return `${this.owner}/${this.repo}`
  }

  static fromPayloadRepo(repository: {
    owner: { login: string }
    name: string
  }): RepositoryContext {
    return {
      owner: repository.owner.login,
      repo: repository.name,
    }
  }
}
