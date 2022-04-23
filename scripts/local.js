import { readFile } from 'fs/promises'
import '../node_modules/netlify-cli/node_modules/dotenv/config.js'
import { createClient } from '@supabase/supabase-js'
import { sendRequest } from './activitypub.js'

let privateKey = null
const actor = process.env.ACTOR_ID
const keyId = `${actor}#main-key`

export const send = async (to, msg) => {
  if (!privateKey) {
    privateKey = await readFile('./private.pem', 'utf8')
  }
  return await sendRequest(to, { actor, ...msg }, privateKey, keyId)
}

export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
