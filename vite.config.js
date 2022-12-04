import { defineConfig } from 'vite'
import kotori from '@musakui/kotori/plugin'
import { toPEM, fromPrivate } from '@musakui/fedi/keys'

const domain = process.env.URL || 'https://randna.me'

const publicKey = fromPrivate(toPEM(process.env.AP_PRIVATE_KEY))

const prop = (name, value) => ({ type: 'PropertyValue', name, value })

const randName = {
	name: 'randName()',
	summary: 'I make stuff 👨‍💻',
	published: '2022-04-20T02:04:02.202Z',
	url: domain,
	inbox: '/ap/inbox',
	outbox: 'https://social.randna.me/o/randName',
	icon: {
		type: 'Image',
		mediaType: 'image/png',
		url: `${domain}/avatar.png`,
	},
	attachment: [
		prop('site', `<a href="${domain}">randna.me</a>`),
		prop('location', 'Singapore'),
		prop('pronouns', 'he/him'),
	],
	alsoKnownAs: [
		'https://kopiti.am/users/randName',
		'https://misskey.io/users/928de7yz6l',
		'https://misskey.dev/users/8z6lgkz571',
	],
	publicKey,
}

const mahjong = {
	summary: 'mahjong stuff',
	inbox: '/ap/inbox',
	outbox: 'https://social.randna.me/o/🀄️',
	publicKey,
}

export default defineConfig({
	plugins: [
		kotori({
			domain,
			profiles: {
				randName,
				'🀄️': mahjong,
			},
			processHeaders: (h) => ({
				_headers: Object.entries(h).map(([fn, hs]) => `/${fn}\n${
					Object.entries(hs).map(([k, v]) => `  ${k}: ${v}`).join('\n')
					}\n`).join('\n'),
			}),
		}),
	],
	ssr: {
		noExternal: [
			'@musakui/*',
		],
	},
})

