import fetch from 'node-fetch'
import * as HS from '@musakui/fedi/hs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

HS.useFetch(fetch)
HS.useKey(process.env.AP_KEY_ID, `-----BEGIN RSA PRIVATE KEY-----
${process.env.AP_PRIVATE_KEY}
-----END RSA PRIVATE KEY-----`)

const private_key = `-----BEGIN PRIVATE KEY-----
${process.env.FIREBASE_PRIVATE_KEY}
-----END PRIVATE KEY-----`

const db = getFirestore(initializeApp({
	credential: cert({
		project_id: process.env.FIREBASE_PROJECT_ID,
		client_email: process.env.FIREBASE_CLIENT_EMAIL,
		private_key,
	}),
}))

export const handleRequest = async (req) => {
	let sender = null
	try {
		sender = await HS.verifyRequest(req)
	} catch (err) {
		if (!err.message.startsWith('failed to get key')) {
			console.warn(err.message)
			console.log(req.body)
		}
	}

	if (!sender) return

	const payload = JSON.parse(req.body)

	await db.collection('inbox').add({
		sender: sender.id,
		received: new Date(),
		payload,
	})
}
