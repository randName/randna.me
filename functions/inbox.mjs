import { fetch, postMessage, github } from '../scripts/utils.js'
import { createHash, createVerify } from 'crypto'

const domain = process.env.URL || 'https://randna.me'
const actor = process.env.ACTOR_URL || `${domain}/actor`
const myInbox = process.env.INBOX_URL || 'post /activity/inbox'
const keyId = process.env.KEY_ID || `${actor}#main-key`
const logRepo = process.env.LOG_REPO || 'randName/activitypub-log'

const gh = github(logRepo, `Bearer ${process.env.GITHUB_TOKEN}`)
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
${process.env.PRIVATE_KEY}
-----END RSA PRIVATE KEY-----`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type,Host,Date,Digest,Signature',
}

const verifyMessage = async (headers) => {
  if (!headers.signature) return null
  const sig = Object.fromEntries(headers.signature.split(',').map((s) => {
    const [k, ...v] = s.split('=')
    return [k, v.join('=').replace(/(^"|"$)/g, '')]
  }))
  if (!sig.keyId || !sig.algorithm || !sig.headers) return null

  const toVerify = sig.headers.split(' ').map((h) => `${h}: ${
    h === '(request-target)' ? myInbox : headers[h]
  }`).join('\n')

  try {
    const veri = createVerify(sig.algorithm)
    veri.update(toVerify)
    const { publicKey: pk, ...act } = JSON.parse(await fetch(sig.keyId, {
      headers: { accept: 'application/json' },
    }))
    if (veri.verify(pk.publicKeyPem, sig.signature, 'base64')) return act
  } catch (err) {
    return null
  }

  return null
}

const bad = (body = 'bad request') => ({ statusCode: 400, headers: cors, body })

const send = (to, msg) => postMessage(to, { actor, ...msg }, privateKey, keyId)

const update = async (path, message, updater) => {
  const p = `contents/${path}`
  const { sha, content: old } = await gh(p)
  const updated = updater(Buffer.from(old, 'base64').toString())
  const content = Buffer.from(updated).toString('base64')
  return await gh(p, 'PUT', JSON.stringify({ sha, message, content }))
}

export const handler = async (evt, ctx) => {
  if (evt.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors }
  if (evt.httpMethod !== 'POST') return { statusCode: 404, headers: cors, body: 'not found' }

  if (evt.headers.date) {
    const evtDate = new Date(evt.headers.date)
    const dt = Math.abs(new Date() - evtDate)
    if (dt > 1e4) return bad('invalid date')
  }

  if (evt.headers.digest) {
    const [ha, ...hd] = evt.headers.digest.split('=')
    const hasher = (ha === 'SHA-256') ? createHash('sha256') : null
    const result = hasher?.update(evt.body).digest('base64')
    if (hd.join('=') !== result) return bad('digest mismatch')
  }

  const sender = await verifyMessage(evt.headers)
  if (!sender) return bad('signature verification failed')

  const { '@context': actx, ...payload } = JSON.parse(evt.body)
  if (sender.id !== payload.actor) return bad('actor mismatch')

  switch (payload.type) {
    case 'Undo':
      if (payload.object.type === 'Follow' && payload.object.object === actor) {
        await update('followers.tsv', `unfollowed by ${sender.id}`, (old) => {
          return old.split('\n').filter((i) => i.split('\t')[1] !== sender.id).join('\n')
        })
      }
      break
    case 'Follow':
      if (payload.object === actor) {
        const { commit } = await update('followers.tsv', `followed by ${sender.id}`, (old) => {
          const lines = old.split('\n')
          lines.splice(-1, 0, `${Date.now()}\t${sender.id}`)
          return lines.join('\n')
        })
        const id = `${domain}/a/${commit.sha}`
        const resp = await send(sender.inbox, { id, type: 'Accept', object: payload })
        console.log('Accept: ', id, resp)
      }
      break
    case 'Create':
      console.log('Create: ', payload.object.id)
      break
    default:
      console.log(payload)
  }

  return { statusCode: 200, headers: cors, body: 'ok' }
}
