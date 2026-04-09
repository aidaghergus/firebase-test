import { useState, useEffect } from 'react'
import { ref, uploadBytesResumable } from 'firebase/storage'
import { signOut } from 'firebase/auth'
import { storage, auth, listDocumentsFn, deleteDocumentFn } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'

function DocumentRow({ doc, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}" and all its data?`)) return
    setDeleting(true)
    try {
      await deleteDocumentFn({ documentId: doc.id })
      onDelete(doc.id)
    } catch (err) {
      console.error(err)
      alert('Error deleting document. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const typeColor =
    doc.type === 'website'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-blue-100 text-blue-700'
  const typeLabel = doc.type === 'website' ? 'Website' : 'File'

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">{doc.name}</span>
        </div>
        <p className="text-xs text-gray-400">{doc.chunkCount} chunks indexed</p>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex-shrink-0 text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState(null) // { type: 'info'|'error', message }

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    try {
      const result = await listDocumentsFn()
      setDocuments(result.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function showStatus(message, type = 'info') {
    setStatus({ message, type })
    setTimeout(() => setStatus(null), 8000)
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.type)) {
      showStatus('Only PDF and Word (.docx) files are supported.', 'error')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    showStatus(`Uploading "${file.name}"...`)

    const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        setUploadProgress(pct)
      },
      (err) => {
        console.error(err)
        showStatus('Upload failed. Please try again.', 'error')
        setUploading(false)
      },
      () => {
        showStatus(
          `"${file.name}" uploaded successfully. It is being processed — it will appear in the list in a few seconds.`,
        )
        setUploading(false)
        setUploadProgress(0)
        setTimeout(loadDocuments, 6000)
      },
    )
    e.target.value = ''
  }

  function handleDocumentDeleted(id) {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-headline font-bold text-on-background">Document Vault</h1>
            <p className="text-xs text-outline">Admin — manage the knowledge base</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
            <a href="/" className="text-sm text-blue-600 hover:underline">
              Go to Chat
            </a>
            <button
              onClick={() => signOut(auth)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status banner */}
        {status && (
          <div
            className={`text-sm px-4 py-3 rounded-xl border ${
              status.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Upload file */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Upload Document</h2>
          <p className="text-xs text-gray-500 mb-4">PDF or Word (.docx) files</p>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              {uploading ? (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Uploading... {uploadProgress}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Click to select a file or drag & drop</p>
              )}
            </div>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </section>

        {/* Document list */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Knowledge Base{' '}
            <span className="text-gray-400 font-normal">({documents.length} documents)</span>
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">
                No documents yet. Upload a file above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onDelete={handleDocumentDeleted} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}