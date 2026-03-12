import { Link } from 'react-router-dom'
import { SERVER_UPDATES } from '../data/serverUpdates'

function ServerUpdatesPage() {
  return (
    <main className="server-page">
      <section className="card full-width">
        <h2>Patch & Update Server</h2>
        <p>Kumpulan riwayat patch, perbaikan, dan update terbaru server.</p>
        <Link className="btn btn-secondary" to="/server">
          Kembali ke Server Page
        </Link>
      </section>

      <section className="metric-grid">
        {SERVER_UPDATES.map((item) => (
          <Link
            key={item.id}
            className="card metric-card update-link-card"
            to={`/server/updates/${item.id}`}
          >
            <h2>{item.version}</h2>
            <p>{item.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}

export default ServerUpdatesPage
