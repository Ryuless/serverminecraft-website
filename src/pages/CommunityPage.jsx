import { COMMUNITY_INFO } from '../data/siteData'

function CommunityPage() {
  return (
    <main className="community-page community-layout">
      <section className="card card-hero community-hero full-width panel-animate panel-delay-1">
        <p className="community-kicker">Community Hub</p>
        <h2>Informasi Community</h2>
        <p className="community-summary">
          Tempat dimana semua orang bisa bergabung, mencari teman dan havefun bersama. Tanpa rasa sedih, Hanya kebahagiaan
        </p>
        <div className="community-highlight-grid">
          <div className="community-highlight-item">
            <p className="info-label">Nama Admin</p>
            <p className="info-value">{COMMUNITY_INFO.adminName}</p>
          </div>
          <div className="community-highlight-item">
            <p className="info-label">Dibuat Sejak</p>
            <p className="info-value">{COMMUNITY_INFO.createdSince}</p>
          </div>
          <div className="community-highlight-item">
            <p className="info-label">Total Channel</p>
            <p className="info-value">{COMMUNITY_INFO.socials.length} Platform</p>
          </div>
        </div>
      </section>

      <section className="card community-section panel-animate panel-delay-2">
        <h2>Ringkasan Komunitas</h2>
        <div className="community-points">
          <article className="community-point">
            <h3>Komunikasi Aktif</h3>
            <p>Semua pengumuman dan koordinasi member dipusatkan lewat komunitas.</p>
          </article>
          <article className="community-point">
            <h3>Support Member</h3>
            <p>Tempat tanya-jawab, laporan issue, dan bantu member baru bergabung dan berteman.</p>
          </article>
          <article className="community-point">
            <h3>Fun And Happy</h3>
            <p>Keseruan dan canda tawa yang akan menyelimuti semuanya setiap hari.</p>
          </article>
        </div>
      </section>

      <section className="card community-section panel-animate panel-delay-3">
        <h2>Sosial Media Community</h2>
        <div className="social-links social-links-grid">
          {COMMUNITY_INFO.socials.map((social) => (
            <a
              key={social.label}
              className="social-link"
              href={social.url}
              target="_blank"
              rel="noreferrer"
            >
              <span>{social.label}</span>
              <span className="social-arrow">→</span>
            </a>
          ))}
        </div>
      </section>

    </main>
  )
}

export default CommunityPage
