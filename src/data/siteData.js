const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const defaultRealtimeMetricsEndpoint = isLocalHost
  ? 'http://localhost:9300/api/realtime-metrics'
  : '/api/realtime-metrics'

const defaultRealtimeMetricsStreamEndpoint = isLocalHost
  ? 'http://localhost:9300/api/realtime-metrics/stream'
  : ''

export const SERVER_CONFIG = {
  name: 'Veynar SMP',
  version: '1.21+ (1.21.11 recommended)',
  maintenanceMode: false,
  refreshIntervalMs: 1000,
  java: {
    ip: 'veynarsmp.my.id',
    port: 25889,
  },
  bedrock: {
    ip: 'veynarsmp.my.id',
    port: 25889,
  },
  realtimeMetricsEndpoint:
    import.meta.env.VITE_REALTIME_METRICS_ENDPOINT || defaultRealtimeMetricsEndpoint,
  realtimeMetricsStreamEndpoint:
    import.meta.env.VITE_REALTIME_METRICS_STREAM_ENDPOINT ||
    defaultRealtimeMetricsStreamEndpoint,
}

export const COMMUNITY_INFO = {
  adminName: 'Ryu',
  createdSince: '10 March 2023',
  socials: [
    { label: 'Grup WhatsApp', url: 'https://chat.whatsapp.com/' },
    { label: 'Discord', url: 'https://discord.gg/' },
    { label: 'YouTube', url: 'https://youtube.com/' },
  ],
}

export const initialStats = {
  online: false,
  playersOnline: 0,
  maxPlayers: 0,
  tps: null,
  uptimeSeconds: null,
  error: '',
  updatedAt: null,
}

export function formatUptime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || Number.isNaN(totalSeconds)) {
    return 'Tidak tersedia'
  }

  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(safeSeconds / 86400)
  const hours = Math.floor((safeSeconds % 86400) / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)

  return `${days} d, ${hours} h, ${minutes} m `
}
