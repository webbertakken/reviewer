import { ChatGPTAPI } from 'chatgpt'

const apiKey = process.env.OPENAI_API_KEY || ''

export const gpt = new ChatGPTAPI({ apiKey })
