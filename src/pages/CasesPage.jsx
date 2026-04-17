import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCaseFn, listCasesFn, deleteCaseFn } from '../firebase.js'
import PortalNavbar from '../components/PortalNavbar.jsx'

export default function CasesPage() {
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
    <div className="min-h-screen bg-surface font-body text-on-surface">

      <PortalNavbar
        active="cases"
        extraActions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-dim transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Case
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-16">

        {/* New case form */}
        {showForm && (
          <form onSubmit={handleCreateCase} className="mb-8 p-6 bg-white rounded-2xl border border-surface-container-high shadow-sm flex gap-3">
            <input
              autoFocus
              type="text"
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              placeholder="Case name..."
              disabled={creating}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-container-high text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
            <button
              type="submit"
              disabled={creating || !newCaseName.trim()}
              className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary-dim disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewCaseName('') }}
              className="px-4 py-2.5 text-outline rounded-xl text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-outline">Loading cases...</p>
        ) : cases.length === 0 ? (
          <div className="text-center py-32">
            <span className="material-symbols-outlined text-5xl text-outline/40 mb-4 block">folder_open</span>
            <p className="text-on-surface-variant text-sm">No cases yet. Create your first case to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
      </main>
    </div>
  )
}