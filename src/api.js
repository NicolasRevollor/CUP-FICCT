const BASE_URL = import.meta.env.VITE_API_URL || 'https://cup-ficct-production.up.railway.app'

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('token')
  const { headers = {}, ...rest } = options
  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })
}

export { apiFetch }
export default BASE_URL
