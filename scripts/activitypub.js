import { sign, createVerify, createHash } from 'crypto'

const b64 = 'base64'
const ctype = 'content-type'
const requestTarget = '(request-target)'

const hashDigest = (d, algo = 'SHA-256') => {
  if (algo === 'SHA-256') return createHash('sha256').update(d).digest(b64)
  return null
}

const signHeaders = (url, opts, keyId, key) => {
  const toSign = [
    requestTarget, 'host', 'date',
    ...(opts.method === 'POST' ? ['digest', ctype] : []),
  ]
  const head = {
    [requestTarget]: `${opts.method.toLowerCase()} ${url.pathname}`,
    host: url.host,
    ...opts.headers,
  }
  const s = toSign.map((h) => `${h}: ${head[h]}`).join('\n')
  return Object.entries({
    algorithm: 'rsa-sha256',
    keyId,
    headers: toSign.join(' '),
    signature: sign('sha256', s, key).toString(b64),
  }).map(([k, v]) => `${k}="${v}"`).join(',')
}

export const activityJSON = 'application/activity+json'
export const activitystreams = { '@context': 'https://www.w3.org/ns/activitystreams' }

export const verifier = (getKey) => async (headers, body, target) => {
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
    if (hd.join('=') !== hashDigest(body, ha)) {
      throw new Error(`invalid digest: ${headers.digest}`)
    }
  }

  const { publicKey: pk, ...act } = await getKey(sig.keyId)

  if (!pk || !pk.publicKeyPem) {
    throw new Error(`failed to get key: ${sig.keyId}`)
  }

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

export const createRequest = (to, key, message) => {
  const opts = { method: 'POST', headers: {} }

  if (message) {
    opts.body = JSON.stringify({ ...activitystreams, ...message })
    opts.headers[ctype] = activityJSON
    opts.headers.digest = `SHA-256=${hashDigest(opts.body)}`
  } else {
    opts.method = 'GET'
    opts.headers.accept = activityJSON
  }

  opts.headers.date = (new Date()).toUTCString()
  opts.headers.signature = signHeaders(new URL(to), opts, key.id, key.pem)

  return opts
}
