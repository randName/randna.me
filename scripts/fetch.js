import { request } from 'https'

export const fetch = (url, opts = {}) => new Promise((resolve, reject) => {
  const { body, ...o } = opts
  const req = request(url, o, (r) => {
    const chunks = []
    r.on('data', (d) => chunks.push(d))
    r.on('end', () => {
      const text = async () => Buffer.concat(chunks).toString()
      resolve({
        text,
        json: async () => JSON.parse(await text()),
      })
    })
  })
  req.on('error', reject)
  if (body) req.write(body)
  req.end()
})
