import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { LANGUAGES, translations } from '../i18n/landing.js'

export default function PortalNavbar({ active, extraActions }) {
  const { user, role } = useAuth()
  const { lang, setLang } = useLanguage()
  const navigate = useNavigate()
  const t = translations[lang] || translations.en
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#fcf9f8]/70 backdrop-blur-xl shadow-sm">
      <div className="flex justify-between items-center px-12 py-6 max-w-screen-2xl mx-auto">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <img src="https://i.imgur.com/5Sgvd5n.png" alt="Pericles" className="h-8 sm:h-12" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
          <span className="text-lg sm:text-2xl font-bold text-primary leading-tight">Pericles</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center space-x-10 font-serif font-medium tracking-tight">
          <Link
            to="/app"
            className={active === 'assistant'
              ? 'text-[#002349] border-b border-[#735a3a] pb-1'
              : 'text-slate-600 hover:text-[#735a3a] transition-colors duration-300'}
          >
            {t.portal.assistant}
          </Link>
          <Link
            to="/cases"
            className={active === 'cases'
              ? 'text-[#002349] border-b border-[#735a3a] pb-1'
              : 'text-slate-600 hover:text-[#735a3a] transition-colors duration-300'}
          >
            {t.portal.myCases}
          </Link>
          {role === 'admin' && (
            <Link
              to="/admin"
              className={active === 'admin'
                ? 'text-[#002349] border-b border-[#735a3a] pb-1'
                : 'text-slate-600 hover:text-[#735a3a] transition-colors duration-300'}
            >
              {t.portal.documents}
            </Link>
          )}
          {extraActions}
        </div>

        {/* Right: language + user */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block relative">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="appearance-none text-xs font-medium uppercase tracking-widest text-primary border border-primary/30 rounded-md pl-3 pr-6 py-1.5 bg-white focus:outline-none cursor-pointer hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-primary">expand_more</span>
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold uppercase shadow-sm">
                {(user?.displayName || user?.email || '?')[0]}
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400">expand_more</span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-surface-container-high py-2 z-50">
                <div className="px-4 py-3 border-b border-surface-container-high">
                  {user?.displayName && <p className="text-sm font-semibold text-on-background truncate">{user.displayName}</p>}
                  <p className="text-xs text-outline truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { signOut(auth); setUserMenuOpen(false); navigate('/') }}
                  className="w-full text-left px-4 py-2.5 text-sm text-outline hover:text-on-surface hover:bg-surface-container-low flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  {t.portal.signOut}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  )
}