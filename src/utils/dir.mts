import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisFile = fileURLToPath(import.meta.url)

export const rootDir = dirname(dirname(dirname(thisFile)))
export const srcDir = resolve(rootDir, 'src')
