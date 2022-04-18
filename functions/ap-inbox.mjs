import {
  github,
  telegram,
  postMessage,
  verifyHeaders,
} from '../scripts/utils.js'

const domain = process.env.URL
const actor = process.env.ACTOR_URL || `${domain}/i`
const keyId = `${actor}#main-key`

const gh = github(process.env.LOG_REPO, `Bearer ${process.env.GITHUB_TOKEN}`)

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
${process.env.PRIVATE_KEY}
-----END RSA PRIVATE KEY-----`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type,Host,Date,Digest,Signature',
}

const tri = '```'
const chat_id = process.env.CHAT_ID
const tg = telegram(process.env.TELEGRAM_TOKEN)

const formatJSON = (data) => `${tri}json
${JSON.stringify(data, null, 1)}
${tri}`

const sendMessage = (text) => chat_id && tg && tg('sendMessage', {
  text,
  chat_id,
  parse_mode: 'MarkdownV2',
  disable_notification: true,
})

const send = (to, msg) => postMessage(to, { actor, ...msg }, privateKey, keyId)

const update = async (path, message, updater) => {
  if (!gh) return
  const p = `contents/${path}`
  const { sha, content: old } = await gh(p)
  const updated = updater(Buffer.from(old, 'base64').toString())
  const content = Buffer.from(updated).toString('base64')
  return await gh(p, 'PUT', JSON.stringify({ sha, message, content }))
}

const handlePayload = async (payload, sender) => {
  if (payload.type === 'Follow' && payload.object === actor) {
    const message = `Accept Follow from ${sender.id}`
    const { commit } = await update('followers.tsv', message, (old) => {
      const lines = old.split('\n')
      lines.splice(-1, 0, `${Date.now()}\t${sender.id}`)
      return lines.join('\n')
    })
    const id = `${domain}/a/${commit.sha}`
    const resp = await send(sender.inbox, { id, type: 'Accept', object: payload })
    console.log('Accept: ', id, resp)
    return
  } else if (payload.type === 'Undo') {
    if (payload.object.type === 'Follow' && payload.object.object === actor) {
      await update('followers.tsv', `unfollowed by ${sender.id}`, (old) => {
        return old.split('\n').filter((i) => i.split('\t')[1] !== sender.id).join('\n')
      })
      return
    }
  }

  switch (payload.type) {
    case 'Create': case 'Update':
      console.log(payload.type, payload.object.id)
      break
    case 'Accept': case 'Reject':
    default:
      console.log(payload)
  }

  try {
    await sendMessage(formatJSON(payload))
  } catch (err) {
  }
}

export const handler = async (evt, ctx) => {
  if (evt.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors }
  if (evt.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'not allowed' }

  try {
    const sender = await verifyHeaders(evt.headers, evt.body, evt.path)
    if (!sender) throw new Error('signature verification failed')

    const { '@context': _, ...payload } = JSON.parse(evt.body)
    if (sender.id !== payload.actor) throw new Error('actor mismatch')

    await handlePayload(payload, sender)
  } catch (err) {
    console.warn('[err]', err.message, evt)
    return { statusCode: 400, headers: cors, body: `${err.message}` }
  }

  return { statusCode: 200, headers: cors, body: 'ok' }
}
