import { mkdir, readFile, writeFile } from 'fs/promises'

const publishDir = 'dist'
const wfDir = `${publishDir}/webfinger`

const getPublicKey = async ({ path, ...pk }) => ({
  ...pk,
  publicKeyPem: await readFile(path, 'utf8')
})

import('../config.js').then(async ({ actor, actorPath, publicKey, webfinger }) => {
  if (!actorPath) throw new Error('actorPath not set')
  if (!publicKey?.path) throw new Error('publicKey.path not set')

  await mkdir(wfDir, { recursive: true })
  await writeFile(`${wfDir}/${webfinger.subject}`, JSON.stringify(webfinger))
  await writeFile(`${publishDir}/${actorPath}`, JSON.stringify({
    ...actor,
    publicKey: await getPublicKey(publicKey),
  }))
}).catch((err) => {
  if (err.code === 'ERR_MODULE_NOT_FOUND') {
    console.error('config.js not found')
  } else {
    console.error(err.message)
  }
  process.exit(1)
})
