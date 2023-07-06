import type { ChatGPTAPI } from 'chatgpt'

const apiKey = process.env.OPENAI_API_KEY || ''

export class Gpt {
  static async init(): Promise<ChatGPTAPI> {
    const { ChatGPTAPI } = await import('chatgpt')

    return new ChatGPTAPI({ apiKey })
  }
}
