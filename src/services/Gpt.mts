import { ChatGPTAPI, ChatMessage, SendMessageOptions } from 'chatgpt'
import { Config } from '../config/config.mjs'

export class Gpt {
  private readonly client: ChatGPTAPI
  private readonly isMock: boolean
  private options: SendMessageOptions = {}

  constructor(config: Config['gpt'], isMock = false) {
    const { apiKey } = config

    this.isMock = isMock

    // Workaround for fetch in worker env: https://github.com/transitive-bullshit/chatgpt-api/issues/592#issuecomment-1614001104
    this.client = new ChatGPTAPI({ apiKey, fetch: self.fetch.bind(self) })
  }

  async ask(prompt: string): Promise<ChatMessage> {
    if (this.isMock) {
      console.log(`Using mock GPT ask:\n${prompt}\n`)
      return {
        text: 'This is a mock response',
        id: 'mock-id',
        role: 'assistant',
      }
    }
    return this.client.sendMessage(prompt, this.options)
  }
}
