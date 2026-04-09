import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { LANGUAGES } from '../i18n/landing.js'

/**
 * Top navbar shared across all portal pages.
 * active: 'assistant' | 'cases' | 'admin'
 * extraActions: optional JSX rendered between nav links and lang selector (e.g. a "New Case" button)
 */
export default function PortalNavbar({ active, extraActions }) {
  const { user, role } = useAuth()
  const { lang, setLang } = useLanguage()
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
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-lg flex justify-between items-center px-8 py-4 shadow-sm border-b border-surface-container-high/50">
      {/* Left: mobile logo + desktop nav links */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 md:hidden">
          <img
            src="https://i.imgur.com/5Sgvd5n.png"
            alt="Pericles"
            className="h-7"
            loading="lazy"
            onError={(e) => e.target.style.display = 'none'}
          />
          <span className="text-lg font-headline font-bold text-on-background">Pericles</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 font-headline font-medium tracking-tight text-sm">
          <Link
            to="/app"
            className={active === 'assistant'
              ? 'text-primary border-b-2 border-primary pb-1 font-bold'
              : 'text-outline hover:text-on-background transition-colors'}
          >
            Assistant
          </Link>
          <Link
            to="/cases"
            className={active === 'cases'
              ? 'text-primary border-b-2 border-primary pb-1 font-bold'
              : 'text-outline hover:text-on-background transition-colors'}
          >
            My Cases
          </Link>
          {role === 'admin' && (
            <Link
              to="/admin"
              className={active === 'admin'
                ? 'text-primary border-b-2 border-primary pb-1 font-bold'
                : 'text-outline hover:text-on-background transition-colors'}
            >
              Documents
            </Link>
          )}
        </nav>
        {extraActions && <div className="flex items-center gap-3">{extraActions}</div>}
      </div>

      {/* Right: language selector + user dropdown */}
      <div className="flex items-center gap-3">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="hidden sm:block text-xs font-medium text-primary border border-primary/30 rounded-md px-2 py-1.5 bg-transparent focus:outline-none cursor-pointer hover:border-primary transition-colors"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            <span
              className="material-symbols-outlined text-lg text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_circle
            </span>
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-surface-container-high py-2 z-50">
              <div className="px-4 py-3 border-b border-surface-container-high">
                {user?.displayName && (
                  <p className="text-sm font-semibold text-on-background truncate">{user.displayName}</p>
                )}
                <p className="text-xs text-outline truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { signOut(auth); setUserMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-outline hover:text-on-surface hover:bg-surface-container-low flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}