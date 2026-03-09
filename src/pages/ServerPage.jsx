import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SERVER_CONFIG,
  formatUptime,
  initialStats,
} from '../data/siteData'

const REDEEM_HISTORY_STORAGE_KEY = 'veynarsmp_redeem_history'

function ServerPage() {
  const [stats, setStats] = useState(initialStats)
  const [isRedeemOpen, setIsRedeemOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameMatched, setNicknameMatched] = useState(false)
  const [nicknameLookupLoading, setNicknameLookupLoading] = useState(false)
  const [redeemCodeInput, setRedeemCodeInput] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [floatingNotice, setFloatingNotice] = useState(null)
  const [rewardHistory, setRewardHistory] = useState(() => {
    const raw = localStorage.getItem(REDEEM_HISTORY_STORAGE_KEY)
    if (!raw) {
      return []
    }

    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [cubeRotation, setCubeRotation] = useState({ x: -22, y: 35 })
  const dragStateRef = useRef({
    dragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startRotationX: -22,
    startRotationY: 35,
  })

  const javaJoinUrl = useMemo(
    () => `minecraft://connect/${SERVER_CONFIG.java.ip}:${SERVER_CONFIG.java.port}`,
    [],
  )

  const bedrockJoinUrl = useMemo(
    () =>
      `minecraft://?addExternalServer=${encodeURIComponent(
        SERVER_CONFIG.name,
      )}|${SERVER_CONFIG.bedrock.ip}:${SERVER_CONFIG.bedrock.port}`,
    [],
  )

  const serverStatus = SERVER_CONFIG.maintenanceMode
    ? 'maintenance'
    : stats.online
      ? 'online'
      : 'offline'

  const statusText =
    serverStatus === 'online'
      ? 'Online'
      : serverStatus === 'offline'
        ? 'Offline'
        : 'Maintenance'

  const statusLabel = statusText

  function openRedeemPopup() {
    setIsRedeemOpen(true)
  }

  function closeRedeemPopup() {
    setIsRedeemOpen(false)
    setNicknameInput('')
    setNicknameMatched(false)
    setRedeemCodeInput('')
  }

  function showFloatingNotice(type, message) {
    setFloatingNotice({ type, message })
  }

  async function readJsonPayload(response) {
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return null
    }

    try {
      return await response.json()
    } catch {
      return null
    }
  }

  async function handleFindNickname() {
    const normalizedNickname = nicknameInput.trim()
    if (!normalizedNickname) {
      setNicknameMatched(false)
      showFloatingNotice('fail', 'gagal')
      return
    }

    try {
      setNicknameLookupLoading(true)
      const response = await fetch('/api/find-nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: normalizedNickname,
        }),
      })

      const payload = await readJsonPayload(response)

      if (!response.ok || !payload?.match) {
        setNicknameMatched(false)
        showFloatingNotice('fail', payload?.message || 'gagal')
        return
      }

      setNicknameMatched(true)
      showFloatingNotice('success', 'nickname match')
    } catch {
      setNicknameMatched(false)
      showFloatingNotice('fail', 'gagal koneksi api')
    } finally {
      setNicknameLookupLoading(false)
    }
  }

  async function handleRedeemSubmit(event) {
    event.preventDefault()
    const normalizedCode = redeemCodeInput.trim().toUpperCase()
    const normalizedNickname = nicknameInput.trim()

    if (!normalizedNickname || !nicknameMatched) {
      showFloatingNotice('fail', 'gagal')
      return
    }

    if (!normalizedCode) {
      showFloatingNotice('fail', 'gagal')
      return
    }

    try {
      setRedeemLoading(true)
      const response = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: normalizedCode,
          player: normalizedNickname,
        }),
      })

      const payload = await readJsonPayload(response)

      if (!response.ok || !payload?.ok) {
        showFloatingNotice('fail', payload?.message || 'gagal')
        return
      }

      setRewardHistory((current) => [
        {
          code: normalizedCode,
          amount: payload.amount,
          claimedAt: new Date().toISOString(),
        },
        ...current,
      ])
      showFloatingNotice('success', `redeemed - Rp ${Number(payload.amount || 0).toLocaleString('id-ID')}`)
      setRedeemCodeInput('')
    } catch {
      showFloatingNotice('fail', 'gagal koneksi api')
    } finally {
      setRedeemLoading(false)
    }
  }

  function handleCubePointerDown(event) {
    dragStateRef.current = {
      dragging: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotationX: cubeRotation.x,
      startRotationY: cubeRotation.y,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleCubePointerMove(event) {
    if (!dragStateRef.current.dragging || dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragStateRef.current.startX
    const deltaY = event.clientY - dragStateRef.current.startY

    setCubeRotation({
      x: dragStateRef.current.startRotationX - deltaY * 0.45,
      y: dragStateRef.current.startRotationY + deltaX * 0.45,
    })
  }

  function handleCubePointerUp(event) {
    if (dragStateRef.current.pointerId === event.pointerId) {
      dragStateRef.current.dragging = false
      dragStateRef.current.pointerId = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  async function loadServerStatus() {
    if (!SERVER_CONFIG.realtimeMetricsEndpoint) {
      return
    }

    try {
      const response = await fetch(SERVER_CONFIG.realtimeMetricsEndpoint, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Gagal mengambil data Plan metrics')
      }

      const payload = await response.json()
      applyRealtimeMetrics(payload)
    } catch {
      setStats((current) => ({
        ...current,
        error: 'Plan metrics tidak dapat diakses saat ini.',
        updatedAt: new Date(),
      }))
    }

  }

  function applyRealtimeMetrics(payload) {
    setStats((current) => ({
      ...current,
      online: typeof payload?.online === 'boolean' ? payload.online : current.online,
      playersOnline:
        typeof payload?.playersOnline === 'number'
          ? payload.playersOnline
          : current.playersOnline,
      maxPlayers:
        typeof payload?.maxPlayers === 'number'
          ? payload.maxPlayers
          : current.maxPlayers,
      tps: typeof payload?.tps === 'number' ? payload.tps : current.tps,
      uptimeSeconds:
        typeof payload?.uptimeSeconds === 'number'
          ? payload.uptimeSeconds
          : current.uptimeSeconds,
      error: payload?.error || '',
      updatedAt: payload?.updatedAt ? new Date(payload.updatedAt) : current.updatedAt,
    }))
  }

  useEffect(() => {
    loadServerStatus()
  }, [])

  useEffect(() => {
    if (!SERVER_CONFIG.realtimeMetricsStreamEndpoint) {
      return
    }

    const stream = new EventSource(SERVER_CONFIG.realtimeMetricsStreamEndpoint)

    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        applyRealtimeMetrics(payload)
      } catch {
        // ignore malformed payload
      }
    }

    stream.onerror = () => {
      setStats((current) => ({
        ...current,
        error: current.error || 'Koneksi realtime terputus, mencoba menyambung ulang...',
      }))
    }

    return () => stream.close()
  }, [])

  useEffect(() => {
    if (!SERVER_CONFIG.realtimeMetricsEndpoint) {
      return
    }

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(SERVER_CONFIG.realtimeMetricsEndpoint, {
          cache: 'no-store',
        })

        if (!response.ok) {
          return
        }

        const payload = await response.json()
        applyRealtimeMetrics(payload)
      } catch {
        // ignore fallback polling errors
      }
    }, Math.max(SERVER_CONFIG.refreshIntervalMs, 5000))

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const tickerId = setInterval(() => {
      setStats((current) => {
        if (typeof current.uptimeSeconds !== 'number') {
          return current
        }

        return {
          ...current,
          uptimeSeconds: current.uptimeSeconds + 60,
        }
      })
    }, 60000)

    return () => clearInterval(tickerId)
  }, [])

  useEffect(() => {
    localStorage.setItem(REDEEM_HISTORY_STORAGE_KEY, JSON.stringify(rewardHistory))
  }, [rewardHistory])

  useEffect(() => {
    if (!floatingNotice) {
      return
    }

    const timeoutId = setTimeout(() => {
      setFloatingNotice(null)
    }, 2800)

    return () => clearTimeout(timeoutId)
  }, [floatingNotice])

  return (
    <main className="server-page">
      <section className="card status-card full-width">
        <div className="status-header-row">
          <h2>Status Server</h2>
          <div className={`status-pill ${serverStatus}`}>{statusLabel}</div>
        </div>

        <div className="status-main-grid">
          <div className="status-info-grid">
            <article className="status-info-item">
              <p className="status-note-label">IP Java</p>
              <p className="status-note-value">
                {SERVER_CONFIG.java.ip}:{SERVER_CONFIG.java.port}
              </p>
            </article>
            <article className="status-info-item">
              <p className="status-note-label">IP Bedrock</p>
              <p className="status-note-value">
                {SERVER_CONFIG.bedrock.ip}:{SERVER_CONFIG.bedrock.port}
              </p>
            </article>
            <article className="status-info-item">
              <p className="status-note-label">Versi Server</p>
              <p className="status-note-value">{SERVER_CONFIG.version}</p>
            </article>
          </div>
        </div>

        <div className="join-buttons">
          <a className="btn btn-primary" href={javaJoinUrl}>
            Join Java
          </a>
          <a className="btn btn-secondary" href={bedrockJoinUrl}>
            Join Bedrock
          </a>
        </div>
        <p className="hint">
          Java membutuhkan launcher Minecraft dalam kondisi berjalan agar link join
          dapat langsung bekerja.
        </p>
      </section>

      <section className="metric-grid">
        <article className="card metric-card">
          <h2>Online Player</h2>
          <p className="metric-value">
            {stats.playersOnline} / 100
          </p>
        </article>

        <article className="card metric-card">
          <h2>TPS</h2>
          <p className="metric-value">
            {stats.tps !== null ? `${Number(stats.tps).toFixed(2)}/20` : 'Tidak tersedia'}
          </p>
        </article>

        <article className="card metric-card">
          <h2>Uptime Server</h2>
          <p className="metric-value">{formatUptime(stats.uptimeSeconds)}</p>
        </article>
      </section>

      <section className="card full-width">
        <h2>Info Monitoring</h2>
        <p>Source: Plan Plugin</p>
        <p>
          Update terakhir:{' '}
          {stats.updatedAt ? stats.updatedAt.toLocaleString('id-ID') : 'Belum ada data'}
        </p>
        {stats.error && <p className="error-text">{stats.error}</p>}
        {SERVER_CONFIG.maintenanceMode && (
          <p className="warning-text">
            Server sedang maintenance. Ganti maintenanceMode ke false jika
            maintenance selesai.
          </p>
        )}
      </section>

      <section className="server-extra-grid full-width">
        <article className="card cube-card">
          <h2>Interactive 3D Block</h2>
          <p className="hint">Drag block untuk memutar dari berbagai sisi.</p>
          <div
            className="cube-stage"
            onPointerDown={handleCubePointerDown}
            onPointerMove={handleCubePointerMove}
            onPointerUp={handleCubePointerUp}
            onPointerCancel={handleCubePointerUp}
          >
            <div
              className="cube"
              style={{
                transform: `rotateX(${cubeRotation.x}deg) rotateY(${cubeRotation.y}deg)`,
              }}
            >
              <div className="cube-face cube-front cube-side cube-main-text">VEYNARSMP</div>
              <div className="cube-face cube-back cube-side">
                <div className="cube-face-content">
                  <span className="cube-face-label">Online</span>
                  <strong>{stats.playersOnline}/100</strong>
                </div>
              </div>
              <div className="cube-face cube-right cube-side">
                <div className="cube-face-content">
                  <span className="cube-face-label">TPS</span>
                  <strong>{stats.tps !== null ? `${Number(stats.tps).toFixed(2)}/20` : '-'}</strong>
                </div>
              </div>
              <div className="cube-face cube-left cube-side">
                <div className="cube-face-content">
                  <span className="cube-face-label">Status</span>
                  <strong>{statusLabel}</strong>
                </div>
              </div>
              <div className="cube-face cube-top cube-top-face">
                <div className="cube-face-content">
                  <span className="cube-face-label">Server</span>
                  <strong>Veynar SMP</strong>
                </div>
              </div>
              <div className="cube-face cube-bottom cube-bottom-face">
                <div className="cube-face-content">
                  <span className="cube-face-label">Uptime</span>
                  <strong>{stats.uptimeSeconds ? `${Math.floor(stats.uptimeSeconds / 60)}m` : '-'}</strong>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="card updates-card">
          <h2>Info & Update Server</h2>
          <div className="updates-list">
            <p>
              <strong>Status saat ini:</strong> {statusLabel}
            </p>
            <p>
              <strong>Online player:</strong> {stats.playersOnline}/100
            </p>
            <p>
              <strong>Performa TPS:</strong>{' '}
              {stats.tps !== null ? `${Number(stats.tps).toFixed(2)}/20` : 'Tidak tersedia'}
            </p>
            <p>
              <strong>Uptime:</strong> {formatUptime(stats.uptimeSeconds)}
            </p>
            <p>
              <strong>Update terbaru:</strong>{' '}
              {stats.updatedAt ? stats.updatedAt.toLocaleString('id-ID') : 'Belum ada data update'}
            </p>
            <p className="updates-note">
              Pantau halaman ini secara berkala untuk info maintenance, event, dan
              pembaruan performa server.
            </p>
          </div>
        </article>
      </section>

      <button type="button" className="btn btn-redeem-float" onClick={openRedeemPopup}>
        Redeem Code
      </button>

      {isRedeemOpen && (
        <div className="redeem-popup-backdrop" onClick={closeRedeemPopup}>
          <div className="redeem-popup" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="redeem-popup-header">
              <h2>Redeem Code</h2>
              <button type="button" className="redeem-close-btn" onClick={closeRedeemPopup}>
                ✕
              </button>
            </div>
            <form className="redeem-form" onSubmit={handleRedeemSubmit}>
              <div className="redeem-player-row">
                <input
                  className="redeem-input"
                  type="text"
                  placeholder="Masukkan nickname Minecraft"
                  value={nicknameInput}
                  onChange={(event) => {
                    setNicknameInput(event.target.value)
                    setNicknameMatched(false)
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary redeem-find-btn"
                  onClick={handleFindNickname}
                  disabled={nicknameLookupLoading}
                >
                  Find
                </button>
              </div>
              <input
                className="redeem-input"
                type="text"
                placeholder="Masukkan code"
                value={redeemCodeInput}
                disabled={!nicknameMatched}
                onChange={(event) => setRedeemCodeInput(event.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary redeem-submit-btn"
                disabled={redeemLoading || !nicknameMatched}
              >
                Redeem
              </button>
            </form>
            <div className="redeem-gift-list">
              <p className="redeem-gift-title">List Gift Didapatkan</p>
              {rewardHistory.length === 0 ? (
                <p className="redeem-gift-empty">Belum ada gift.</p>
              ) : (
                <ul>
                  {rewardHistory.map((item, index) => (
                    <li key={`${item.code}-${item.claimedAt}-${index}`}>
                      {item.code} - Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {floatingNotice && (
        <div className={`floating-redeem-notice ${floatingNotice.type}`}>
          {floatingNotice.message}
        </div>
      )}

    </main>
  )
}

export default ServerPage
