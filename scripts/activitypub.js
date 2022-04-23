import { sign, createVerify, createHash } from 'crypto'
import { fetch } from './fetch.js'

const b64 = 'base64'
const ctype = 'content-type'
const requestTarget = '(request-target)'
const signHeaders = [requestTarget, 'host', 'date', 'digest', ctype]
const signatureHeader = signHeaders.join(' ')

const getSigHeader = (keyId, signature) => Object.entries({
  algorithm: 'rsa-sha256',
  keyId,
  headers: signatureHeader,
  signature,
}).map(([k, v]) => `${k}="${v}"`).join(',')

const urlParams = (u, m) => ({ [requestTarget]: `${m} ${u.pathname}`, host: u.host })

export const activityJSON = 'application/activity+json'

export const activitystreams = { '@context': 'https://www.w3.org/ns/activitystreams' }

export const getActivity = (url) => fetch(url, {
  headers: { accept: `application/json,${activityJSON}` },
}).then((r) => r.json())

export const verifyRequest = async (headers, body, target) => {
  if (!headers.signature) throw new Error('missing signature header')

  if (headers.date) {
    const evtDate = new Date(headers.date)
    const dt = Math.abs(new Date() - evtDate)
    if (!(dt < 1e5)) throw new Error(`invalid date: ${headers.date} (${dt})`)
  }

  const sig = Object.fromEntries(headers.signature.split(',').map((s) => {
    const [k, ...v] = s.split('=')
    return [k, v.join('=').replace(/(^"|"$)/g, '')]
  }))

  if (!sig.keyId || !sig.algorithm || !sig.headers || !sig.signature) {
    throw new Error(`invalid signature: ${headers.signature}`)
  }

  if (headers.digest) {
    const [ha, ...hd] = headers.digest.split('=')
    const hasher = (ha === 'SHA-256') ? createHash('sha256') : null
    const result = hasher?.update(body).digest(b64)
    if (hd.join('=') !== result) throw new Error(`invalid digest: ${headers.digest}`)
  }

  const { publicKey: pk, ...act } = await getActivity(sig.keyId)

  if (pk.id && pk.id !== sig.keyId) {
    throw new Error(`invalid keyId: ${sig.keyId} != ${pk.id}`)
  }

  const veri = createVerify(sig.algorithm)
  veri.update(sig.headers.split(' ').map((h) => `${h}: ${
    h === requestTarget ? target : headers[h]
  }`).join('\n'))

  if (veri.verify(pk.publicKeyPem, sig.signature, b64)) return act

  throw new Error('verification failed')
}

export const sendRequest = async (to, message, key, keyId, method = 'POST') => {
  const upar = urlParams(new URL(to), method.toLowerCase())
  const body = JSON.stringify({ ...activitystreams, ...message })
  const digest = `SHA-256=${createHash('sha256').update(body).digest(b64)}`
  const head = {
    [ctype]: activityJSON,
    date: (new Date()).toUTCString(),
    digest,
  }

  const s = signHeaders.map((h) => `${h}: ${head[h] || upar[h]}`).join('\n')
  const signature = getSigHeader(keyId, sign('sha256', s, key).toString(b64))
  const resp = await fetch(to, {
    method,
    body,
    headers: { ...head, signature },
  })

  try {
    return await resp.json()
  } catch (err) {
    return await resp.text()
  }
}
