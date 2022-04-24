const applicationJSON = { 'content-type': 'application/json' }

export const github = (repo, authorization) => {
  if (!repo) return null
  const api = `https://api.github.com/repos/${repo}`
  const headers = {
    authorization,
    ...applicationJSON,
    'transfer-encoding': 'chunked',
    'user-agent': 'CustomActivityPub v0.0.1',
  }
  return async (path, method, body) => {
    const resp = await fetch(`${api}/${path}`, { method, body, headers })
    try {
      return await resp.json()
    } catch (err) {
      return await resp.text()
    }
  }
}

export const telegram = (token) => {
  if (!token) return null
  const api = `https://api.telegram.org/bot${token}`
  return (method, payload) => fetch(`${api}/${method}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: applicationJSON,
  }).then((r) => r.json())
}
