const RAW_API_BASE = import.meta.env.VITE_API_BASE
const API_BASE_ERROR =
  'Missing VITE_API_BASE. Set it in the frontend .env file and restart the dev server.'
let missingLogged = false

const normalizeApiBase = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

const getApiBase = () => {
  const normalized = normalizeApiBase(RAW_API_BASE)
  if (normalized) return normalized
  if (!missingLogged) {
    missingLogged = true
    console.error(API_BASE_ERROR)
  }
  return null
}

export { API_BASE_ERROR, getApiBase }
