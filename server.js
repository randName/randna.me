import { handleInbox } from '@musakui/kotori/handler'
import { addToInbox } from './src/firebase.js'

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST',
	'Access-Control-Allow-Headers': 'Content-Type,Host,Date,Digest,Signature',
}

export const apInbox = async (evt) => {
	const { httpMethod: method, headers, body } = evt
	if (method === 'OPTIONS') return { statusCode: 204, headers: cors }
	if (method !== 'POST') return { statusCode: 405, body: 'not allowed' }

	try {
		const req = await handleInbox(method, evt.path, headers, body)
		if (req) {
			await addToInbox({ ...req, received: new Date() })
		}
	} catch (err) {
		console.warn(err.message)
		console.log(body)
		console.log(headers)
		return { statusCode: 400, body: `${err.message}` }
	}

	return { statusCode: 200, headers: cors, body: 'ok' }
}
