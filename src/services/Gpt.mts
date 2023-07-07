import { ChatGPTAPI, ChatMessage, SendMessageOptions } from 'chatgpt'
import { config } from '../config/config.mjs'

export class Gpt {
  private readonly client: ChatGPTAPI
  private options: SendMessageOptions = {}

  constructor() {
    const { apiKey } = config.openAi

    this.client = new ChatGPTAPI({ apiKey })
  }

  async ask(prompt: string): Promise<ChatMessage> {
    if (process.env.MOCK_GPT === 'true') {
      console.log(`Using mock GPT ask:\n${prompt}\n`)
      return {
        text: 'This is a mock response',
        id: 'mock-id',
        role: 'assistant',
      }
    }
    return this.client.sendMessage(prompt, this.options)
  }

  setOnProgress(onProgress?: (partialResponse: ChatMessage) => void) {
    this.options.onProgress = onProgress
  }
}
