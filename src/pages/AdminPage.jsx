import { useState, useEffect } from 'react'
import { ref, uploadBytesResumable } from 'firebase/storage'
import { storage, listDocumentsFn, deleteDocumentFn } from '../firebase.js'
import PortalNavbar from '../components/PortalNavbar.jsx'

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
      ? 'bg-primary-container text-primary'
      : 'bg-secondary-container text-secondary'
  const typeLabel = doc.type === 'website' ? 'Website' : 'File'

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-surface-container-high shadow-sm">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-sm font-medium text-on-background truncate">{doc.name}</span>
        </div>
        <p className="text-xs text-outline">{doc.chunkCount} chunks indexed</p>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex-shrink-0 text-xs px-3 py-1.5 text-error border border-error/20 rounded-lg hover:bg-error/5 disabled:opacity-50 transition-colors"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}

export default function AdminPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState(null)

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
        showStatus(`"${file.name}" uploaded successfully. It is being processed — it will appear in the list in a few seconds.`)
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
    <div className="min-h-screen bg-surface font-body text-on-surface">

      <PortalNavbar active="admin" />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-16 space-y-6">

        {/* Status banner */}
        {status && (
          <div className={`text-sm px-4 py-3 rounded-xl border ${
            status.type === 'error'
              ? 'bg-error-container border-error/20 text-on-error-container'
              : 'bg-primary-container border-primary/20 text-on-primary-container'
          }`}>
            {status.message}
          </div>
        )}

        {/* Upload */}
        <section className="bg-white rounded-2xl border border-surface-container-high shadow-sm p-6">
          <h2 className="font-headline text-base font-semibold text-on-background mb-1">Upload Document</h2>
          <p className="text-xs text-outline mb-4">PDF or Word (.docx) files</p>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-surface-container-high rounded-xl p-8 text-center hover:border-primary/40 hover:bg-primary-container/10 transition-colors">
              {uploading ? (
                <div>
                  <p className="text-sm text-on-surface-variant mb-3">Uploading... {uploadProgress}%</p>
                  <div className="w-full bg-surface-container-high rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-outline">Click to select a file or drag & drop</p>
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
          <h2 className="font-headline text-base font-semibold text-on-background mb-3">
            Knowledge Base{' '}
            <span className="text-outline font-normal">({documents.length} documents)</span>
          </h2>
          {loading ? (
            <p className="text-sm text-outline">Loading...</p>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-container-high p-8 text-center">
              <p className="text-sm text-outline">No documents yet. Upload a file above.</p>
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