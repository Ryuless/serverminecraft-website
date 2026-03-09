/* eslint-env node */
import { Rcon } from 'rcon-client'

const REDEEM_CODE_REWARDS = (() => {
  try {
    const fromEnv = process.env.REDEEM_CODE_REWARDS_JSON
    if (!fromEnv) {
      return {
        GABUT500: 500,
        VEYNAR1000: 1000,
        RYUVIP2500: 2500,
      }
    }

    const parsed = JSON.parse(fromEnv)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return Object.entries(parsed).reduce((result, [code, amount]) => {
      const numericAmount = Number(amount)
      if (Number.isFinite(numericAmount) && numericAmount > 0) {
        result[String(code).toUpperCase()] = Math.floor(numericAmount)
      }
      return result
    }, {})
  } catch {
    return {}
  }
})()

const RCON_HOST = (process.env.MC_RCON_HOST || '').trim()
const RCON_PORT = Number(process.env.MC_RCON_PORT || 25575)
const RCON_PASSWORD = (process.env.MC_RCON_PASSWORD || '').trim()
const RCON_TIMEOUT_MS = Number(process.env.MC_RCON_TIMEOUT_MS || 5000)
const ECONOMY_MODE = (process.env.ECONOMY_PLUGIN_MODE || 'vault').trim().toLowerCase()
const ECO_COMMAND_TEMPLATE = (process.env.ECO_COMMAND_TEMPLATE || '').trim()
const REDEEM_DEFAULT_PLAYER = (process.env.REDEEM_DEFAULT_PLAYER || '').trim()
const ALLOW_REPEAT_REDEEM_SAME_IP = (process.env.ALLOW_REPEAT_REDEEM_SAME_IP || 'false').trim() === 'true'

const redeemedIps = new Set()

function sanitizeIp(ipAddress) {
  if (!ipAddress) {
    return ''
  }

  return String(ipAddress)
    .trim()
    .replace(/^::ffff:/i, '')
    .replace(/^\[|\]$/g, '')
}

function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const firstIp = forwarded.split(',')[0]
    const sanitized = sanitizeIp(firstIp)
    if (sanitized) {
      return sanitized
    }
  }

  const realIpHeader = req.headers?.['x-real-ip']
  if (typeof realIpHeader === 'string' && realIpHeader.length > 0) {
    const sanitized = sanitizeIp(realIpHeader)
    if (sanitized) {
      return sanitized
    }
  }

  const socketIp = sanitizeIp(req.socket?.remoteAddress || req.connection?.remoteAddress)
  if (socketIp) {
    return socketIp
  }

  return 'unknown'
}

function isValidMinecraftUsername(value) {
  return /^[a-zA-Z0-9_]{3,16}$/.test(value)
}

function getSafeRconPort() {
  if (Number.isInteger(RCON_PORT) && RCON_PORT > 0 && RCON_PORT <= 65535) {
    return RCON_PORT
  }

  return 25575
}

function getSafeRconTimeout() {
  if (Number.isFinite(RCON_TIMEOUT_MS) && RCON_TIMEOUT_MS >= 1000 && RCON_TIMEOUT_MS <= 20000) {
    return RCON_TIMEOUT_MS
  }

  return 5000
}

function resolveEcoCommand(player, amount) {
  if (ECO_COMMAND_TEMPLATE) {
    return ECO_COMMAND_TEMPLATE
      .replaceAll('{player}', player)
      .replaceAll('{amount}', String(amount))
  }

  if (ECONOMY_MODE === 'liteeco') {
    return `liteeco give ${player} ${amount}`
  }

  return `eco give ${player} ${amount}`
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

async function executeRconCommand(command) {
  const rcon = await Rcon.connect({
    host: RCON_HOST,
    port: getSafeRconPort(),
    password: RCON_PASSWORD,
    timeout: getSafeRconTimeout(),
  })

  try {
    const output = await rcon.send(command)
    return output
  } finally {
    rcon.end()
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, status: 'fail', message: 'Method tidak diizinkan.' })
    return
  }

  try {
    const body = await parseJsonBody(req)
    const code = String(body?.code || '').trim().toUpperCase()
    const player = String(body?.player || REDEEM_DEFAULT_PLAYER).trim()
    const clientIp = getClientIp(req)

    if (!code) {
      res.status(400).json({ ok: false, status: 'fail', message: 'Code wajib diisi.' })
      return
    }

    if (!player) {
      res.status(400).json({
        ok: false,
        status: 'fail',
        message: 'Player tidak ditemukan. Set REDEEM_DEFAULT_PLAYER atau kirim player di body.',
      })
      return
    }

    if (!isValidMinecraftUsername(player)) {
      res.status(400).json({
        ok: false,
        status: 'fail',
        message: 'Username player tidak valid. Gunakan 3-16 karakter (huruf, angka, underscore).',
      })
      return
    }

    const amount = REDEEM_CODE_REWARDS[code]

    if (!amount) {
      res.status(400).json({ ok: false, status: 'fail', message: 'Code tidak valid.' })
      return
    }

    if (!ALLOW_REPEAT_REDEEM_SAME_IP && clientIp !== 'unknown' && redeemedIps.has(clientIp)) {
      res.status(403).json({
        ok: false,
        status: 'fail',
        message: 'IP ini sudah pernah melakukan redeem.',
      })
      return
    }

    if (!RCON_HOST || !RCON_PASSWORD) {
      res.status(500).json({
        ok: false,
        status: 'fail',
        message: 'RCON belum dikonfigurasi. Lengkapi MC_RCON_HOST, MC_RCON_PORT, dan MC_RCON_PASSWORD.',
      })
      return
    }

    const command = resolveEcoCommand(player, amount)
    const commandOutput = await executeRconCommand(command)
    if (clientIp !== 'unknown') {
      redeemedIps.add(clientIp)
    }

    res.status(200).json({
      ok: true,
      status: 'redeemed',
      code,
      player,
      amount,
      clientIp,
      command,
      commandOutput,
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: 'fail',
      message: error instanceof Error ? error.message : 'Gagal memproses redeem.',
    })
  }
}
