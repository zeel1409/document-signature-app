const TOKEN_KEY = 'dsa_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getCurrentUser() {
  const token = getToken()
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const data = JSON.parse(json)
    if (!data || typeof data !== 'object') return null
    return {
      id: data.userId,
      email: data.email,
      name: data.name,
    }
  } catch {
    return null
  }
}

