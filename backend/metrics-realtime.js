import 'dotenv/config'
import cors from 'cors'
import express from 'express'

const app = express()
app.use(cors())

const METRICS_PORT = Number(process.env.METRICS_PORT || 9300)
const UPDATE_INTERVAL_MS = Number(process.env.METRICS_INTERVAL_MS || 1000)
const PLAN_BASE_URL = (process.env.PLAN_BASE_URL || '').trim().replace(/\/$/, '')
const PLAN_METRICS_ENDPOINT = (process.env.PLAN_METRICS_ENDPOINT || '').trim()
const PLAN_AUTH_TOKEN = (process.env.PLAN_AUTH_TOKEN || '').trim()
const PLAN_SERVER_UUID = (process.env.PLAN_SERVER_UUID || '').trim()
const PLAN_TIMEOUT_MS = Number(process.env.PLAN_TIMEOUT_MS || 5000)

const SERVER_UUID_CACHE_TTL_MS = 60_000
let cachedServerUuid = null
let cachedServerUuidAt = 0

let latest = {
  online: false,
  tps: null,
  uptimeSeconds: null,
  playersOnline: null,
  maxPlayers: null,
  updatedAt: null,
  error: 'Belum ada data realtime.',
  parseHints: [],
  source: 'plan',
  endpoint: null,
  raw: {
    payload: null,
  },
}

const sseClients = new Set()

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

function extractPlanMetrics(payload) {
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
    online = tps !== null || playersOnline !== null
  }

  return {
    tps,
    uptimeSeconds,
    playersOnline,
    maxPlayers,
    online,
  }
}

function buildParseHints(metrics) {
  const hints = []

  if (metrics.tps === null) {
    hints.push('Field TPS belum ditemukan di response Plan API.')
  }

  if (metrics.uptimeSeconds === null) {
    hints.push('Field uptime (detik) belum ditemukan di response Plan API.')
  }

  if (metrics.playersOnline === null) {
    hints.push('Field online player belum ditemukan di response Plan API.')
  }

  if (metrics.maxPlayers === null) {
    hints.push('Field max player belum ditemukan di response Plan API.')
  }

  return hints
}

function millisecondsToSeconds(value) {
  const numericValue = toNumberOrNull(value)
  if (numericValue === null) return null

  return Math.max(0, Math.floor(numericValue / 1000))
}

function extractKnownOverviewMetrics(serverOverview, performanceOverview) {
  const playersOnline = toNumberOrNull(serverOverview?.numbers?.online_players)
  const uptimeSeconds =
    millisecondsToSeconds(serverOverview?.numbers?.current_uptime) ??
    millisecondsToSeconds(performanceOverview?.numbers?.server_uptime_24h)

  const tps =
    toNumberOrNull(performanceOverview?.numbers?.tps_24h) ??
    toNumberOrNull(performanceOverview?.numbers?.tps_7d) ??
    toNumberOrNull(serverOverview?.last_7_days?.average_tps)

  const maxPlayers =
    toNumberOrNull(serverOverview?.numbers?.max_players) ??
    toNumberOrNull(serverOverview?.numbers?.best_peak_players)

  const online =
    (playersOnline !== null && playersOnline >= 0) ||
    (uptimeSeconds !== null && uptimeSeconds > 0) ||
    tps !== null

  return {
    tps,
    uptimeSeconds,
    playersOnline,
    maxPlayers,
    online,
  }
}

async function fetchJsonWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PLAN_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
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

function resolvePlanUrls() {
  if (PLAN_METRICS_ENDPOINT) {
    return [PLAN_METRICS_ENDPOINT]
  }

  return []
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
  const networkMetadata = await fetchJsonWithTimeout(networkMetadataUrl, { headers })

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

function broadcastLatest() {
  const payload = `data: ${JSON.stringify(latest)}\n\n`
  sseClients.forEach((res) => res.write(payload))
}

async function updateMetrics() {
  const planUrls = resolvePlanUrls()

  if (!planUrls.length && !PLAN_BASE_URL) {
    latest = {
      ...latest,
      online: false,
      updatedAt: new Date().toISOString(),
      error: 'PLAN_BASE_URL atau PLAN_METRICS_ENDPOINT belum diisi.',
      parseHints: [],
    }
    broadcastLatest()
    return
  }

  const headers = PLAN_AUTH_TOKEN
    ? { Authorization: `Bearer ${PLAN_AUTH_TOKEN}` }
    : {}

  let payload = null
  let endpoint = null
  let lastError = null
  let usedDirectEndpoint = false

  try {
    if (PLAN_METRICS_ENDPOINT) {
      for (const url of planUrls) {
        try {
          payload = await fetchJsonWithTimeout(url, { headers })
          endpoint = url
          usedDirectEndpoint = true
          break
        } catch (error) {
          lastError = error
        }
      }

      if (!payload && !PLAN_BASE_URL) {
        throw lastError || new Error('Endpoint Plan metrics gagal diakses.')
      }
    }

    if (!payload) {
      const serverUuid = await resolveServerUuid(headers)
      const encodedServer = encodeURIComponent(serverUuid)
      const serverOverviewUrl = `${PLAN_BASE_URL}/v1/serverOverview?server=${encodedServer}`
      const performanceOverviewUrl = `${PLAN_BASE_URL}/v1/performanceOverview?server=${encodedServer}`

      const [serverOverview, performanceOverview] = await Promise.all([
        fetchJsonWithTimeout(serverOverviewUrl, { headers }),
        fetchJsonWithTimeout(performanceOverviewUrl, { headers }),
      ])

      payload = {
        serverUUID: serverUuid,
        serverOverview,
        performanceOverview,
        directEndpointError:
          lastError instanceof Error ? lastError.message : undefined,
      }
      endpoint = `${serverOverviewUrl} + ${performanceOverviewUrl}`
    }

    const metrics = usedDirectEndpoint
      ? extractPlanMetrics(payload)
      : extractKnownOverviewMetrics(
          payload?.serverOverview,
          payload?.performanceOverview
        )
    const parseHints = buildParseHints(metrics)

    latest = {
      online: Boolean(metrics.online),
      tps: metrics.tps,
      uptimeSeconds: metrics.uptimeSeconds,
      playersOnline: metrics.playersOnline,
      maxPlayers: metrics.maxPlayers,
      updatedAt: new Date().toISOString(),
      error: '',
      parseHints,
      source: 'plan',
      endpoint,
      raw: {
        payload,
      },
    }
  } catch (error) {
    latest = {
      ...latest,
      online: false,
      updatedAt: new Date().toISOString(),
      error:
        error instanceof Error
          ? error.message
          : 'Gagal mengambil metrics dari Plan API.',
      parseHints: [],
      source: 'plan',
    }
  } finally {
    broadcastLatest()
  }
}

app.get('/', (_req, res) => {
  res.json({
    service: 'minecraft-realtime-metrics-plan',
    source: 'plan',
    endpoints: {
      snapshot: '/api/realtime-metrics',
      stream: '/api/realtime-metrics/stream',
    },
    intervalMs: UPDATE_INTERVAL_MS,
  })
})

app.get('/api/realtime-metrics', (_req, res) => {
  res.json(latest)
})

app.get('/api/realtime-metrics/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  res.write(`data: ${JSON.stringify(latest)}\n\n`)
  sseClients.add(res)

  req.on('close', () => {
    sseClients.delete(res)
  })
})

setInterval(updateMetrics, UPDATE_INTERVAL_MS)
updateMetrics()

app.listen(METRICS_PORT, () => {
  console.log(`Realtime metrics API running on http://localhost:${METRICS_PORT}`)
})
