import { handleRequest } from '../src/handler.js'

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST',
	'Access-Control-Allow-Headers': 'Content-Type,Host,Date,Digest,Signature',
}

export const handler = async (evt, ctx) => {
	const method = evt.httpMethod
	if (method === 'OPTIONS') return { statusCode: 204, headers: cors }
	if (method !== 'POST') return { statusCode: 405, headers: cors, body: 'not allowed' }

	const { path, body, headers } = evt
	try {
		await handleRequest({ method, path, headers, body })
	} catch (err) {
		console.warn(err.message)
		console.log(body)
		console.log(headers)
		return { statusCode: 400, headers: cors, body: `${err.message}` }
	}

	return { statusCode: 200, headers: cors, body: 'ok' }
}
