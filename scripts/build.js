import { mkdir, appendFile } from 'fs/promises'
import { Keys, WebFinger, ActivityPub } from '@musakui/fedi'
import { create } from './activitypub.js'

const privateKey = process.env.AP_PRIVATE_KEY
if (!privateKey) throw new Error('AP_PRIVATE_KEY not set')

const publicKeyPem = Keys.fromPrivate(`-----BEGIN RSA PRIVATE KEY-----
${process.env.AP_PRIVATE_KEY}
-----END RSA PRIVATE KEY-----`)

const ctype = 'Content-Type'
const jrdJSON = WebFinger.CONTENT_TYPE

const url = process.env.URL

const webfingerRedirect = (wf) => `
# WebFinger
/${wf} resource=:rs /${wf}/:rs 200`

import('../config.js').then(async ({ default: config }) => {
	const outDir = config.outDir || 'dist'
	const nodeinfo = '.well-known/nodeinfo'
	const webfinger = WebFinger.PATH

	const write = (path, data) => appendFile(`${outDir}/${path}`, data)

	const fileHeaders = [
		...Object.entries({
			[webfinger]: { [ctype]: jrdJSON },
			[nodeinfo]: { [ctype]: jrdJSON },
			nodeinfo: { [ctype]: 'application/json' },
		}),
		...config.profiles.map((p) => [
			p.profilePath, { [ctype]: ActivityPub.activityJSON }
		]) ?? []
	]

	await mkdir(`${outDir}/${webfinger}`, { recursive: true })

	const files = config.profiles?.flatMap((p) => Object.entries(create({
		...p,
		url,
		publicKeyPem,
	})))

	for (const [path, data] of files) {
		await write(path, JSON.stringify(data))
	}

	await write(nodeinfo, JSON.stringify({
		links: [{
			rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
			href: `${url}/nodeinfo`,
		}],
	}))

	await write(`nodeinfo`, JSON.stringify({
		version: '2.1',
		openRegistrations: false,
		protocols: ['activitypub'],
		usage: { users: { total: 1 } },
	}))

	await write(`_redirects`, webfingerRedirect(webfinger))

	await write(`_headers`, fileHeaders.map(([p, hs]) => {
		const lines = Object.entries(hs).map(([k, v]) => `  ${k}: ${v}`)
		return `/${p}\n${lines.join('\n')}\n`
	}).join('\n'))

	console.log('done')
}).catch((err) => {
	if (err.code === 'ERR_MODULE_NOT_FOUND') {
		console.error('config not found')
	} else {
		console.error(err.message)
	}
	process.exit(1)
})
