/* eslint-env node */

const MOJANG_LOOKUP_TIMEOUT_MS = Number(process.env.MOJANG_LOOKUP_TIMEOUT_MS || 5000)

function getSafeLookupTimeout() {
  if (Number.isFinite(MOJANG_LOOKUP_TIMEOUT_MS) && MOJANG_LOOKUP_TIMEOUT_MS >= 1000 && MOJANG_LOOKUP_TIMEOUT_MS <= 20000) {
    return MOJANG_LOOKUP_TIMEOUT_MS
  }

  return 5000
}

function isValidMinecraftUsername(value) {
  return /^[a-zA-Z0-9_]{3,16}$/.test(value)
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }

  return await new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

async function lookupNickname(nickname) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), getSafeLookupTimeout())

  try {
    const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nickname)}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      return false
    }

    const payload = await response.json()
    return Boolean(payload?.id && payload?.name)
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, match: false, message: 'Method tidak diizinkan.' })
    return
  }

  try {
    const body = await parseJsonBody(req)
    const nickname = String(body?.nickname || '').trim()

    if (!nickname || !isValidMinecraftUsername(nickname)) {
      res.status(400).json({ ok: false, match: false, message: 'Nickname tidak valid.' })
      return
    }

    const match = await lookupNickname(nickname)
    res.status(200).json({ ok: true, match, nickname })
  } catch {
    res.status(200).json({ ok: true, match: false })
  }
}
