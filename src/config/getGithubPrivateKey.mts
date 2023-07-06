import { join } from 'node:path'
import { rootDir } from '../utils/dir.mjs'
import { readFileSync } from 'node:fs'

export function getGithubPrivateKey() {
  const privateKey = join(rootDir, 'pr-code-reviewer.private-key.pem')
  return readFileSync(privateKey, 'utf8')
}
