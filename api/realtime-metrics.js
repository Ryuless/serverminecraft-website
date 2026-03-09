const PLAN_BASE_URL =
  (process.env.PLAN_BASE_URL || 'http://veynarsmp.my.id:25621').trim().replace(/\/$/, '')
const PLAN_SERVER_UUID =
  (process.env.PLAN_SERVER_UUID || 'a36977ad-71fd-4225-9cae-efcfbe82bf8d').trim()
const PLAN_AUTH_TOKEN = (process.env.PLAN_AUTH_TOKEN || '').trim()
const PLAN_TIMEOUT_MS = Number(process.env.PLAN_TIMEOUT_MS || 5000)

function toNumberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function millisecondsToSeconds(value) {
  const numericValue = toNumberOrNull(value)
  if (numericValue === null) return null
  return Math.max(0, Math.floor(numericValue / 1000))
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

export default async function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  try {
    if (!PLAN_BASE_URL || !PLAN_SERVER_UUID) {
      res.status(500).json({
        online: false,
        tps: null,
        uptimeSeconds: null,
        playersOnline: null,
        maxPlayers: null,
        updatedAt: new Date().toISOString(),
        error: 'PLAN_BASE_URL atau PLAN_SERVER_UUID belum dikonfigurasi di Vercel.',
      })
      return
    }

    const headers = PLAN_AUTH_TOKEN
      ? { Authorization: `Bearer ${PLAN_AUTH_TOKEN}` }
      : {}

    const encodedServer = encodeURIComponent(PLAN_SERVER_UUID)
    const serverOverviewUrl = `${PLAN_BASE_URL}/v1/serverOverview?server=${encodedServer}`
    const performanceOverviewUrl = `${PLAN_BASE_URL}/v1/performanceOverview?server=${encodedServer}`

    const [serverOverview, performanceOverview] = await Promise.all([
      fetchJsonWithTimeout(serverOverviewUrl, headers),
      fetchJsonWithTimeout(performanceOverviewUrl, headers),
    ])

    const metrics = mapMetrics(serverOverview, performanceOverview)

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
