import { ChatGPTAPI, ChatMessage, SendMessageOptions } from 'chatgpt'
import { config } from '../config/config.mjs'

export class Gpt {
  private readonly client: ChatGPTAPI
  private options: SendMessageOptions = {}

  constructor() {
    const { apiKey } = config.openAi

    this.client = new ChatGPTAPI({ apiKey })
  }

  async ask(prompt: string) {
    return this.client.sendMessage(prompt, this.options)
  }

  setOnProgress(onProgress?: (partialResponse: ChatMessage) => void) {
    this.options.onProgress = onProgress
  }
}
