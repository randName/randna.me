import { fetch } from './utils.js'
import { updateFile, send } from './local.js'

const target = process.argv[2]

if (!target) {
  console.warn('usage: follow ID')
  process.exit(1)
}

const result = await fetch(target, {
  headers: { accept: 'application/json' },
})

if (!result) {
  console.warn('target not found')
  process.exit(1)
}

const tgt = JSON.parse(result)
console.info(`following: ${tgt.preferredUsername} (${tgt.id})`)

const commit = await updateFile('following.tsv', (ori) => {
  const following = ori.split('\n')
  following.splice(-1, 0, `${Date.now()}\t${tgt.id}`)
  return following.join('\n')
}, `Follow ${tgt.id}`)

console.log(`commit: ${commit.sha}`)

console.log(await send(tgt.inbox, {
  id: `https://randna.me/a/${commit.sha}`,
  type: 'Follow',
  object: tgt.id,
}))
