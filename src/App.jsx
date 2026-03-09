import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import CommunityPage from './pages/CommunityPage'
import ServerPage from './pages/ServerPage'
import './App.css'

function App() {
  const location = useLocation()
  const isServerPage = location.pathname === '/server'

  const heroEyebrow = isServerPage ? 'Server Network' : 'AllGames Community'
  const heroTitle = isServerPage ? 'GabutSMP' : 'Gabvers'
  const heroTitleSmall = isServerPage ? 'By Gabvers' : ''
  const heroSubtitle =
    'Community berbasis have fun, yang berdiri tanpa kesengajaan dan memilih bertahan ditengah kesibukan hidup penghuninnya.'

  return (
    <div className="page app-shell">
      <header key={`hero-${location.pathname}`} className="hero hero-enter">
        <p className="eyebrow">{heroEyebrow}</p>
        <h1>
          {heroTitle}
          {heroTitleSmall && <span className="title-small">{heroTitleSmall}</span>}
        </h1>
        <p className="subtitle">{heroSubtitle}</p>
        <nav className="route-switch top-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'btn btn-nav active-nav' : 'btn btn-nav'
            }
          >
            Main Community
          </NavLink>
          <NavLink
            to="/server"
            className={({ isActive }) =>
              isActive ? 'btn btn-nav active-nav' : 'btn btn-nav'
            }
          >
            Server Page
          </NavLink>
        </nav>
      </header>

      <div key={location.pathname} className="route-view page-enter">
        <Routes>
          <Route path="/" element={<CommunityPage />} />
          <Route path="/server" element={<ServerPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
