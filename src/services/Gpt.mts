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
    if (process.env.MOCK_GPT === 'true') {
      console.log(`Using mock GPT ask:\n${prompt}\n`)
      return "I'm a mock GPT response"
    }
    return this.client.sendMessage(prompt, this.options)
  }

  setOnProgress(onProgress?: (partialResponse: ChatMessage) => void) {
    this.options.onProgress = onProgress
  }
}
