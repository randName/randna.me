import { request } from 'https'
import { createHash, createSign, createVerify } from 'crypto'

const context = '@context'

const ctype = 'content-type'
const requestTarget = '(request-target)'
const applicationJSON = 'application/json'
const activityJSON = 'application/activity+json'
const signHeaders = [requestTarget, 'host', 'date', 'digest', ctype]

const urlParams = ({ pathname, host }) => ({ [requestTarget]: `post ${pathname}`, host })

export const activitystreams = { [context]: 'https://www.w3.org/ns/activitystreams' }

export const fetch = (url, opts = {}) => new Promise((resolve, reject) => {
  const { body, ...o } = opts
  const req = request(url, o, (r) => {
    const chunks = []
    r.on('data', (d) => chunks.push(d))
    r.on('end', () => resolve(Buffer.concat(chunks).toString()))
  })
  req.on('error', reject)
  if (body) req.write(body)
  req.end()
})

export const getActivity = async (url) => JSON.parse(await fetch(url, {
  headers: { accept: `${applicationJSON},${activityJSON}` },
}))

export const verifyHeaders = async (headers, body, path) => {
  if (!headers.signature) throw new Error('headers.signature not present')

  if (headers.date) {
    const evtDate = new Date(headers.date)
    const dt = Math.abs(new Date() - evtDate)
    if (dt > 1e4) throw new Error('invalid date')
  }

  if (headers.digest) {
    const [ha, ...hd] = headers.digest.split('=')
    const hasher = (ha === 'SHA-256') ? createHash('sha256') : null
    const result = hasher?.update(body).digest('base64')
    if (hd.join('=') !== result) throw new Error('digest mismatch')
  }

  const sig = Object.fromEntries(headers.signature.split(',').map((s) => {
    const [k, ...v] = s.split('=')
    return [k, v.join('=').replace(/(^"|"$)/g, '')]
  }))

  if (!sig.keyId || !sig.algorithm || !sig.headers) {
    throw new Error('failed to parse headers.signature')
  }

  const toVerify = sig.headers.split(' ').map((h) => `${h}: ${
    h === requestTarget ? `post ${path}` : headers[h]
  }`).join('\n')

  const veri = createVerify(sig.algorithm)
  veri.update(toVerify)

  const { publicKey: pk, ...act } = await getActivity(sig.keyId)

  return veri.verify(pk.publicKeyPem, sig.signature, 'base64') ? act : null
}

export const postMessage = async (to, message, key, keyId) => {
  const body = JSON.stringify({ ...activitystreams, ...message })
  const digest = `SHA-256=${createHash('sha256').update(body).digest('base64')}`
  const date = (new Date()).toUTCString()
  const params = { [ctype]: activityJSON, date, digest }
  const urlPar = urlParams(new URL(to))
  const toSign = signHeaders.map((h) => `${h}: ${params[h] || urlPar[h]}`)
  const signer = createSign('sha256')
  signer.update(toSign.join('\n'))
  signer.end()
  const sig = signer.sign(key).toString('base64')
  return await fetch(to, {
    method: 'POST',
    body,
    headers: {
      ...params,
      signature: [
        `algorithm="rsa-sha256"`, `keyId="${keyId}"`,
        `headers="${signHeaders.join(' ')}"`,
        `signature="${sig}"`,
      ].join(','),
    },
  })
}

export const github = (repo, authorization) => {
  if (!repo) return null
  const api = `https://api.github.com/repos/${repo}`
  const headers = {
    authorization,
    [ctype]: applicationJSON,
    'transfer-encoding': 'chunked',
    'user-agent': 'CustomActivityPub v0.0.1',
  }
  return async (path, method, body) => {
    const resp = await fetch(`${api}/${path}`, { method, body, headers })
    try {
      return JSON.parse(resp)
    } catch (err) {
      return resp
    }
  }
}

export const telegram = (token) => {
  if (!token) return null
  const api = `https://api.telegram.org/bot${token}`
  return (method, payload) => fetch(`${api}/${method}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { [ctype]: applicationJSON },
  })
}
