import { request } from 'https'
import { createHash, createSign } from 'crypto'

const context = '@context'
const activitystreams = 'https://www.w3.org/ns/activitystreams'

const requestTarget = '(request-target)'
const ctype = 'application/activity+json'
const signHeaders = [requestTarget, 'host', 'date', 'digest', 'content-type']

const urlParams = ({ pathname, host }) => ({ [requestTarget]: `post ${pathname}`, host })

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

export const postMessage = async (to, message, key, keyId) => {
  const body = JSON.stringify({ [context]: activitystreams, ...message })
  const digest = `SHA-256=${createHash('sha256').update(body).digest('base64')}`
  const date = (new Date()).toUTCString()
  const params = { 'content-type': ctype, date, digest }
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
  const api = `https://api.github.com/repos/${repo}`
  const headers = {
    authorization,
    'transfer-encoding': 'chunked',
    'content-type': 'application/json',
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
