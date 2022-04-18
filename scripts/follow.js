import { getActivity } from './utils.js'
import { updateFile, send } from './local.js'

const target = process.argv[2]

if (!target) {
  console.warn('usage: follow ID')
  process.exit(1)
}

try {
  const tgt = await getActivity(target)
  if (!tgt.id) throw new Error('cannot find target')
  console.info(`following: ${tgt.preferredUsername} (${tgt.id})`)

  const commit = await updateFile('following.tsv', `Follow ${tgt.id}`, (ori) => {
    const following = ori.split('\n')
    following.splice(-1, 0, `${Date.now()}\t${tgt.id}`)
    return following.join('\n')
  })

  console.log(`commit: ${commit.sha}`)
  console.log(await send(tgt.inbox, {
    id: `https://randna.me/a/${commit.sha}`,
    type: 'Follow',
    object: tgt.id,
  }))
} catch (err) {
  console.warn(err)
  process.exit(1)
}
