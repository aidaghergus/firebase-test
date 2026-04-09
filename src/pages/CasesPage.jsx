import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth, createCaseFn, listCasesFn, deleteCaseFn } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import PortalNavbar from '../components/PortalNavbar.jsx'

export default function CasesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCaseName, setNewCaseName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadCases()
  }, [])

  async function loadCases() {
    try {
      const result = await listCasesFn()
      setCases(result.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCase(e) {
    e.preventDefault()
    if (!newCaseName.trim()) return
    setCreating(true)
    try {
      const result = await createCaseFn({ name: newCaseName.trim() })
      setCases((prev) => [result.data, ...prev])
      setNewCaseName('')
      setShowForm(false)
    } catch (err) {
      console.error(err)
      alert('Failed to create case.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteCase(id, name) {
    if (!confirm(`Delete case "${name}" and all its documents?`)) return
    try {
      await deleteCaseFn({ caseId: id })
      setCases((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete case.')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-body text-on-surface">

      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col h-full border-r border-surface-container-high bg-surface-container-low w-72 text-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <img src="https://i.imgur.com/5Sgvd5n.png" alt="Pericles" className="h-9" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
            <span className="font-headline font-bold text-on-background text-xl">Pericles</span>
          </div>
          <p className="text-xs text-outline mt-1">Legal Assistant</p>
        </div>
        <nav className="flex-1 px-0">
          <ul className="space-y-1">
            <li>
              <Link to="/app" className="text-outline px-6 py-3 flex items-center gap-3 hover:bg-surface-container-high transition-colors hover:translate-x-1 hover:text-on-background">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                Legal Assistant
              </Link>
            </li>
            <li>
              <Link to="/cases" className="bg-white text-on-background rounded-r-full py-3 px-6 shadow-sm font-semibold flex items-center gap-3 hover:translate-x-1 transition-transform">
                <span className="material-symbols-outlined">folder_open</span>
                My Cases
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mt-auto p-4 flex flex-col gap-1 border-t border-surface-container-high">
          <div className="px-6 py-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-lg text-outline">account_circle</span>
            <span className="text-xs text-on-surface-variant truncate">{user?.displayName || user?.email}</span>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="text-outline px-6 py-2 flex items-center gap-3 text-xs hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden">
        <PortalNavbar
          active="cases"
          extraActions={
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary-dim transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              New Case
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">

          {/* New case form */}
          {showForm && (
            <form onSubmit={handleCreateCase} className="mb-6 p-6 bg-surface-container-low rounded-2xl border border-surface-container-high flex gap-3">
              <input
                autoFocus
                type="text"
                value={newCaseName}
                onChange={(e) => setNewCaseName(e.target.value)}
                placeholder="Case name..."
                disabled={creating}
                className="flex-1 px-4 py-2 rounded-xl border border-surface-container-high text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
              <button
                type="submit"
                disabled={creating || !newCaseName.trim()}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary-dim disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewCaseName('') }}
                className="px-4 py-2 text-outline rounded-xl text-sm hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-outline">Loading cases...</p>
          ) : cases.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-surface-container-highest mb-4 block">folder_open</span>
              <p className="text-on-surface-variant text-sm">No cases yet. Create your first case to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="p-6 bg-white border border-surface-container-high rounded-2xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => navigate(`/cases/${c.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">folder</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCase(c.id, c.name) }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-outline hover:text-error transition-all p-1"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                  <h3 className="font-headline font-bold text-on-background mb-1 truncate">{c.name}</h3>
                  <p className="text-xs text-outline">Click to open</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}