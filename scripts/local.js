import { readFile } from 'fs/promises'
import '../node_modules/netlify-cli/node_modules/dotenv/config.js'
import { createClient } from '@supabase/supabase-js'
import { createRequest } from './activitypub.js'

let privateKey = null
const actor = process.env.ACTOR_ID
const keyId = `${actor}#main-key`

const key = async () => {
  if (!privateKey) {
    privateKey = await readFile('./private.pem', 'utf8')
  }
  return { id: keyId, pem: privateKey }
}

export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export const activity = async (url, msg) => {
  const data = msg ? { actor, ...msg } : undefined
  const resp = await fetch(url, createRequest(url, await key(), data))
  return await resp.text()
}
