import { ChatGPTAPI } from 'chatgpt'
import { config } from '../config/config.mjs'

export class Gpt {
  private readonly client: ChatGPTAPI

  constructor() {
    const { apiKey } = config.openAi

    this.client = new ChatGPTAPI({ apiKey })
  }

  async ask(prompt: string) {
    return this.client.sendMessage(prompt)
  }
}
