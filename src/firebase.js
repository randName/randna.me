import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { toPEM } from '@musakui/fedi/keys'

export const db = getFirestore(initializeApp({
	credential: cert({
		project_id: process.env.FIREBASE_PROJECT_ID,
		client_email: process.env.FIREBASE_CLIENT_EMAIL,
		private_key: toPEM(process.env.FIREBASE_PRIVATE_KEY, 'RSA PRIVATE KEY'),
	}),
}))

export const addToInbox = (obj) => db.collection('inbox').add(obj)
