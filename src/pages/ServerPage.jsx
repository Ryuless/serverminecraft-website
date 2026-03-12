import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SERVER_CONFIG,
  formatUptime,
  initialStats,
} from '../data/siteData'

function ServerPage() {
  const [stats, setStats] = useState(initialStats)
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

  function normalizePayload(payload) {
    const playersOnline =
      toNumberOrNull(payload?.playersOnline) ??
      toNumberOrNull(payload?.onlinePlayers) ??
      toNumberOrNull(payload?.playerCount)

    const maxPlayers =
      toNumberOrNull(payload?.maxPlayers) ??
      toNumberOrNull(payload?.playersMax)

    const uptimeSeconds =
      toNumberOrNull(payload?.uptimeSeconds) ??
      toNumberOrNull(payload?.uptime)

    const tps = toNumberOrNull(payload?.tps)

    const online =
      toBooleanOrNull(payload?.online) ??
      toBooleanOrNull(payload?.isOnline) ??
      (playersOnline !== null && playersOnline > 0) ||
      (tps !== null && tps > 0) ||
      (uptimeSeconds !== null && uptimeSeconds > 0)

    return {
      online,
      playersOnline,
      maxPlayers,
      tps,
      uptimeSeconds,
    }
  }

  function applyRealtimeMetrics(payload) {
    const normalized = normalizePayload(payload)

    setStats((current) => ({
      ...current,
      online: typeof normalized.online === 'boolean' ? normalized.online : current.online,
      playersOnline:
        typeof normalized.playersOnline === 'number'
          ? normalized.playersOnline
          : current.playersOnline,
      maxPlayers:
        typeof normalized.maxPlayers === 'number'
          ? normalized.maxPlayers
          : current.maxPlayers,
      tps: typeof normalized.tps === 'number' ? normalized.tps : current.tps,
      uptimeSeconds:
        typeof normalized.uptimeSeconds === 'number'
          ? normalized.uptimeSeconds
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
            {stats.playersOnline} / {stats.maxPlayers || 100}
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
                  <strong>{stats.playersOnline}/{stats.maxPlayers || 100}</strong>
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
              <strong>Online player:</strong> {stats.playersOnline}/{stats.maxPlayers || 100}
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

    </main>
  )
}

export default ServerPage
