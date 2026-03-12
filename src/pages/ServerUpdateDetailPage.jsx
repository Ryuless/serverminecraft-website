import { Link, useParams } from 'react-router-dom'
import { SERVER_UPDATES } from '../data/serverUpdates'

function ServerUpdateDetailPage() {
  const { updateId } = useParams()
  const selectedUpdate = SERVER_UPDATES.find((item) => item.id === updateId)

  if (!selectedUpdate) {
    return (
      <main className="server-page">
        <section className="card full-width">
          <h2>Update Tidak Ditemukan</h2>
          <p>Versi patch yang kamu buka tidak tersedia.</p>
          <div className="join-buttons">
            <Link className="btn btn-secondary" to="/server/updates">
              Kembali ke Daftar Update
            </Link>
            <Link className="btn btn-primary" to="/server">
              Kembali ke Server Page
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="server-page">
      <section className="card full-width">
        <h2>Detail Patch {selectedUpdate.version}</h2>
        <p>Tanggal rilis: {selectedUpdate.date}</p>
        <div className="join-buttons">
          <Link className="btn btn-secondary" to="/server/updates">
            Kembali ke Daftar Update
          </Link>
          <Link className="btn btn-primary" to="/server">
            Kembali ke Server Page
          </Link>
        </div>
      </section>

      {selectedUpdate.image && (
        <section className="card full-width">
          <h2>Preview Update</h2>
          <img
            className="update-detail-image"
            src={selectedUpdate.image}
            alt={`Preview detail patch ${selectedUpdate.version}`}
          />
        </section>
      )}

      <section className="card full-width">
        <h2>Rincian Perubahan</h2>
        <div className="updates-list">
          <pre className="update-detail-text">{selectedUpdate.content}</pre>
        </div>
      </section>
    </main>
  )
}

export default ServerUpdateDetailPage
