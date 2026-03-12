const PLAN_BASE_URL =
  (process.env.PLAN_BASE_URL || 'http://veynarsmp.my.id:25911').trim().replace(/\/$/, '')
const PLAN_SERVER_UUID = (process.env.PLAN_SERVER_UUID || '').trim()
const PLAN_AUTH_TOKEN = (process.env.PLAN_AUTH_TOKEN || '').trim()
const PLAN_TIMEOUT_MS = Number(process.env.PLAN_TIMEOUT_MS || 5000)
const SERVER_UUID_CACHE_TTL_MS = 60_000

let cachedServerUuid = null
let cachedServerUuidAt = 0

function toNumberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toBooleanOrNull(value) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function collectValuesByKey(value, keysToFind, results = {}) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectValuesByKey(entry, keysToFind, results))
    return results
  }

  if (!value || typeof value !== 'object') {
    return results
  }

  Object.entries(value).forEach(([key, nested]) => {
    const normalized = key.toLowerCase()

    if (keysToFind.includes(normalized)) {
      if (!results[normalized]) {
        results[normalized] = []
      }
      results[normalized].push(nested)
    }

    collectValuesByKey(nested, keysToFind, results)
  })

  return results
}

function getFirstNumber(results, keys) {
  for (const key of keys) {
    const values = results[key]
    if (!values) continue

    for (const value of values) {
      const parsed = toNumberOrNull(value)
      if (parsed !== null) return parsed
    }
  }

  return null
}

function getFirstBoolean(results, keys) {
  for (const key of keys) {
    const values = results[key]
    if (!values) continue

    for (const value of values) {
      const parsed = toBooleanOrNull(value)
      if (parsed !== null) return parsed
    }
  }

  return null
}

function millisecondsToSeconds(value) {
  const numericValue = toNumberOrNull(value)
  if (numericValue === null) return null
  return Math.max(0, Math.floor(numericValue / 1000))
}

function extractFallbackMetrics(payload) {
  const trackedKeys = [
    'tps',
    'uptime',
    'uptimeseconds',
    'onlineplayers',
    'playersonline',
    'playercount',
    'maxplayers',
    'playersmax',
    'online',
    'isonline',
  ]

  const values = collectValuesByKey(payload, trackedKeys)

  const tps = getFirstNumber(values, ['tps'])
  const uptimeSeconds = getFirstNumber(values, ['uptimeseconds', 'uptime'])
  const playersOnline = getFirstNumber(values, [
    'onlineplayers',
    'playersonline',
    'playercount',
  ])
  const maxPlayers = getFirstNumber(values, ['maxplayers', 'playersmax'])

  let online = getFirstBoolean(values, ['online', 'isonline'])
  if (online === null) {
    online = tps !== null || playersOnline !== null || uptimeSeconds !== null
  }

  return {
    tps,
    uptimeSeconds,
    playersOnline,
    maxPlayers,
    online,
  }
}

async function fetchJsonWithTimeout(url, headers = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PLAN_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Request gagal (${response.status})`)
    }

    return response.json()
  } finally {
    clearTimeout(timer)
  }
}

function mapMetrics(serverOverview, performanceOverview) {
  const playersOnline = toNumberOrNull(serverOverview?.numbers?.online_players)
  const maxPlayers =
    toNumberOrNull(serverOverview?.numbers?.max_players) ??
    toNumberOrNull(serverOverview?.numbers?.best_peak_players)

  const tps =
    toNumberOrNull(performanceOverview?.numbers?.tps_24h) ??
    toNumberOrNull(performanceOverview?.numbers?.tps_7d) ??
    toNumberOrNull(serverOverview?.last_7_days?.average_tps)

  const uptimeSeconds =
    millisecondsToSeconds(serverOverview?.numbers?.current_uptime) ??
    millisecondsToSeconds(performanceOverview?.numbers?.server_uptime_24h)

  const online =
    (playersOnline !== null && playersOnline > 0) ||
    (tps !== null && tps > 0) ||
    (uptimeSeconds !== null && uptimeSeconds > 0)

  return {
    online,
    tps,
    uptimeSeconds,
    playersOnline,
    maxPlayers,
  }
}

async function resolveServerUuid(headers) {
  if (PLAN_SERVER_UUID) {
    return PLAN_SERVER_UUID
  }

  const now = Date.now()
  if (cachedServerUuid && now - cachedServerUuidAt < SERVER_UUID_CACHE_TTL_MS) {
    return cachedServerUuid
  }

  const networkMetadataUrl = `${PLAN_BASE_URL}/v1/networkMetadata`
  const networkMetadata = await fetchJsonWithTimeout(networkMetadataUrl, headers)

  const discoveredServerUuid =
    networkMetadata?.currentServer?.serverUUID ||
    networkMetadata?.servers?.[0]?.serverUUID ||
    null

  if (!discoveredServerUuid) {
    throw new Error('Gagal menemukan serverUUID dari /v1/networkMetadata.')
  }

  cachedServerUuid = String(discoveredServerUuid)
  cachedServerUuidAt = now

  return cachedServerUuid
}

export default async function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  try {
    if (!PLAN_BASE_URL) {
      res.status(500).json({
        online: false,
        tps: null,
        uptimeSeconds: null,
        playersOnline: null,
        maxPlayers: null,
        updatedAt: new Date().toISOString(),
        error: 'PLAN_BASE_URL belum dikonfigurasi di Vercel.',
      })
      return
    }

    const headers = PLAN_AUTH_TOKEN
      ? { Authorization: `Bearer ${PLAN_AUTH_TOKEN}` }
      : {}

    const serverUuid = await resolveServerUuid(headers)
    const encodedServer = encodeURIComponent(serverUuid)
    const serverOverviewUrl = `${PLAN_BASE_URL}/v1/serverOverview?server=${encodedServer}`
    const performanceOverviewUrl = `${PLAN_BASE_URL}/v1/performanceOverview?server=${encodedServer}`

    const [serverOverview, performanceOverview] = await Promise.all([
      fetchJsonWithTimeout(serverOverviewUrl, headers),
      fetchJsonWithTimeout(performanceOverviewUrl, headers),
    ])

    const overviewMetrics = mapMetrics(serverOverview, performanceOverview)
    const fallbackMetrics = extractFallbackMetrics({
      serverOverview,
      performanceOverview,
    })
    const metrics = {
      online: overviewMetrics.online || fallbackMetrics.online,
      tps: overviewMetrics.tps ?? fallbackMetrics.tps,
      uptimeSeconds: overviewMetrics.uptimeSeconds ?? fallbackMetrics.uptimeSeconds,
      playersOnline: overviewMetrics.playersOnline ?? fallbackMetrics.playersOnline,
      maxPlayers: overviewMetrics.maxPlayers ?? fallbackMetrics.maxPlayers,
    }

    res.status(200).json({
      ...metrics,
      updatedAt: new Date().toISOString(),
      error: '',
      source: 'plan-vercel-api',
    })
  } catch (error) {
    res.status(200).json({
      online: false,
      tps: null,
      uptimeSeconds: null,
      playersOnline: null,
      maxPlayers: null,
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Gagal mengambil data Plan di Vercel.',
      source: 'plan-vercel-api',
    })
  }
}
