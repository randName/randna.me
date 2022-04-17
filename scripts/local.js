import { readFile } from 'fs/promises'
import { github, postMessage } from './utils.js'

let privateKey = null
const actor = process.env.ACTOR_ID
const keyId = `${actor}#main-key`

export const send = async (to, msg) => {
  if (!privateKey) {
    privateKey = await readFile('./private.pem', 'utf8')
  }
  return await postMessage(to, { actor, ...msg }, privateKey, keyId)
}

export const gh = github(process.env.GITHUB_REPO, `Bearer ${process.env.GITHUB_TOKEN}`)

export const updateFile = async (path, updater, message) => {
  if (!message) { message = `update ${path}` }
  const p = `contents/${path}`
  const ori = await gh(p)
  const updated = updater(Buffer.from(ori.content, 'base64').toString())
  const content = Buffer.from(updated).toString('base64')
  const { commit } = await gh(p, 'PUT', JSON.stringify({
    message,
    content,
    sha: ori.sha,
  }))
  return commit
}
