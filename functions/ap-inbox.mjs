import { fetch } from 'cross-fetch'
import { createClient } from '@supabase/supabase-js'
import { verifier, createRequest, activityJSON } from '../scripts/activitypub.js'

const domain = process.env.URL
const testId = `${domain}/test-id`

const actor = process.env.ACTOR_ID || `${domain}/i`
const key = {
  id: `${actor}#main-key`,
  pem: `-----BEGIN RSA PRIVATE KEY-----
${process.env.PRIVATE_KEY}
-----END RSA PRIVATE KEY-----`
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type,Host,Date,Digest,Signature',
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const verifyRequest = verifier((url) => fetch(url, createRequest(url, key)).then((r) => r.json()))

const send = (to, msg) => fetch(to, createRequest(to, key, { actor, ...msg })).then((r) => r.text())

const isFollowMe = (obj) => obj.type === 'Follow' && obj.object === actor

const handlePayload = async (payload, sender) => {
  if (payload.id === testId) {
    console.log('test', sender.id, payload)
    return
  }

  if (isFollowMe(payload)) {
    const { data, error } = await db.from('followers').insert([{ id: payload.actor }])
    if (error) return
    const id = `${domain}/a/${data[0].uuid}`
    const resp = await send(sender.inbox, { id, type: 'Accept', object: payload })
    console.log('Accept: ', id, resp)
    return
  } else if (payload.type === 'Undo') {
    if (isFollowMe(payload.object)) {
      console.log('unfollowed', sender.id, payload)
      await db.from('followers').delete().eq('id', payload.actor)
      return
    }
  }

  const { data, error } = await db.from('inbox').insert([{ sender: sender.id, payload }])
  console.log(data, error)
}

export const handler = async (evt, ctx) => {
  if (evt.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors }
  if (evt.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'not allowed' }

  try {
    const target = `${evt.httpMethod} ${evt.path}`.toLowerCase()
    const sender = await verifyRequest(evt.headers, evt.body, target)

    const { '@context': _, ...payload } = JSON.parse(evt.body)
    if (sender.id !== payload.actor) {
      console.warn(`actor mismatch: ${sender.id} != ${payload.actor}`)
    }

    await handlePayload(payload, sender)
  } catch (err) {
    console.log(evt.body)
    console.log(evt.headers)
    console.warn(err.message)
    return { statusCode: 400, headers: cors, body: `${err.message}` }
  }

  return { statusCode: 200, headers: cors, body: 'ok' }
}
