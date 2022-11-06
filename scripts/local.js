import fetch from 'node-fetch'
import * as HS from '@musakui/fedi/hs'
import '../node_modules/netlify-cli/node_modules/dotenv/config.js'

HS.useFetch(fetch)
HS.useKey(process.env.AP_KEY_ID, `-----BEGIN RSA PRIVATE KEY-----
${process.env.AP_PRIVATE_KEY}
-----END RSA PRIVATE KEY-----`)

const resp = await HS.sendRequest({
	url: `https://${process.argv[2]}/ap/inbox`,
	body: JSON.stringify({
		id: 'test-id',
	}),
})
