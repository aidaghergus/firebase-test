import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { ref, uploadBytesResumable } from 'firebase/storage'
import {
  doc, getDoc, collection, addDoc, updateDoc,
  query, orderBy, getDocs, serverTimestamp,
} from 'firebase/firestore'
import { auth, storage, db, chatFn, listCaseDocumentsFn, deleteCaseDocumentFn } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import PortalNavbar from '../components/PortalNavbar.jsx'

const GREETING = 'Good day! I am Pericles. I can answer questions based on the global knowledge base and the documents you have uploaded to this case. How can I help you?'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-surface-container-highest' : 'bg-primary-container'}`}>
        <span className="material-symbols-outlined text-lg"
          style={!isUser ? { fontVariationSettings: "'FILL' 1", color: '#515d84' } : { color: '#2a3439' }}>
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>
      <div className={`space-y-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`p-5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${isUser
          ? 'bg-primary text-on-primary rounded-tr-none shadow-lg'
          : 'chat-bubble-agent border border-surface-container-high text-on-surface rounded-tl-none'}`}>
          {msg.content}
        </div>
        {msg.sources?.length > 0 && (
          <div className="px-1 pt-1 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Sources</p>
            {msg.sources.map((s, i) => (
              <p key={i} className="text-xs text-primary font-medium">{s.name}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DocumentItem({ doc: docItem, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const sizeKb = docItem.size ? Math.round(docItem.size / 1024) : null

  async function handleDelete() {
    if (!confirm(`Delete "${docItem.name}"?`)) return
    setDeleting(true)
    try { await onDelete(docItem.id) } finally { setDeleting(false) }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-surface-container-high group hover:border-primary/20 transition-colors">
      <div className="w-8 h-8 bg-primary-container/50 rounded-lg flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-sm">description</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-on-background truncate">{docItem.name}</p>
        {sizeKb && <p className="text-[10px] text-outline">{sizeKb} KB</p>}
      </div>
      <button onClick={handleDelete} disabled={deleting}
        className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-all disabled:opacity-50">
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  )
}

function ConversationItem({ conv, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors group flex items-center gap-2 ${
        active ? 'bg-primary-container text-on-primary-container font-semibold' : 'text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      <span className="material-symbols-outlined text-base shrink-0">chat</span>
      <span className="truncate flex-1">{conv.title}</span>
    </button>
  )
}

export default function CasePage() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [caseName, setCaseName] = useState('')
  const [sidebarTab, setSidebarTab] = useState('history') // 'history' | 'documents'

  // Documents
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState(null)

  // Conversations
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null) // null = new conversation
  const [messages, setMessages] = useState([{ role: 'model', content: GREETING }])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!caseId || !user) return
    getDoc(doc(db, `users/${user.uid}/cases/${caseId}`)).then((snap) => {
      if (snap.exists()) setCaseName(snap.data().name)
    })
    loadDocuments()
    loadConversations()
  }, [caseId, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadDocuments() {
    try {
      const result = await listCaseDocumentsFn({ caseId })
      setDocuments(result.data)
    } catch (err) {
      console.error(err)
    } finally {
      setDocsLoading(false)
    }
  }

  async function loadConversations() {
    try {
      const q = query(
        collection(db, `users/${user.uid}/cases/${caseId}/conversations`),
        orderBy('updatedAt', 'desc')
      )
      const snap = await getDocs(q)
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
    }
  }

  function startNewConversation() {
    setActiveConvId(null)
    setMessages([{ role: 'model', content: GREETING }])
    setInput('')
  }

  async function loadConversation(conv) {
    setActiveConvId(conv.id)
    setMessages([
      { role: 'model', content: GREETING },
      ...conv.messages,
    ])
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!input.trim() || chatLoading) return

    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setChatLoading(true)

    try {
      const history = newMessages.slice(1, -1).map((m) => ({ role: m.role, content: m.content }))
      const result = await chatFn({ message: userMessage.content, history, caseId })
      const { answer, sources } = result.data
      const aiMessage = { role: 'model', content: answer, sources: sources || [] }
      const finalMessages = [...newMessages, aiMessage]
      setMessages(finalMessages)

      // Persist to Firestore (exclude greeting from stored messages)
      const storedMessages = finalMessages.slice(1).map((m) => ({
        role: m.role,
        content: m.content,
        sources: m.sources || [],
      }))

      if (!activeConvId) {
        // Create new conversation
        const title = userMessage.content.slice(0, 60) + (userMessage.content.length > 60 ? '…' : '')
        const ref = await addDoc(
          collection(db, `users/${user.uid}/cases/${caseId}/conversations`),
          {
            title,
            messages: storedMessages,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        )
        setActiveConvId(ref.id)
        const newConv = { id: ref.id, title, messages: storedMessages }
        setConversations((prev) => [newConv, ...prev])
      } else {
        // Update existing conversation
        await updateDoc(
          doc(db, `users/${user.uid}/cases/${caseId}/conversations/${activeConvId}`),
          { messages: storedMessages, updatedAt: serverTimestamp() }
        )
        setConversations((prev) =>
          prev.map((c) => c.id === activeConvId ? { ...c, messages: storedMessages } : c)
        )
      }
    } catch (err) {
      console.error(err)
      setMessages([...newMessages, { role: 'model', content: 'An error occurred. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      setUploadStatus({ type: 'error', message: 'Only PDF and Word (.docx) files are supported.' })
      return
    }
    setUploading(true)
    setUploadProgress(0)
    setUploadStatus({ type: 'info', message: `Uploading "${file.name}"...` })
    const storageRef = ref(storage, `users/${user.uid}/cases/${caseId}/${Date.now()}_${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)
    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (err) => { console.error(err); setUploadStatus({ type: 'error', message: 'Upload failed.' }); setUploading(false) },
      () => {
        setUploadStatus({ type: 'info', message: `"${file.name}" uploaded. Processing...` })
        setUploading(false)
        setUploadProgress(0)
        setTimeout(() => { loadDocuments(); setUploadStatus(null) }, 6000)
      }
    )
    e.target.value = ''
  }

  async function handleDeleteDocument(docId) {
    await deleteCaseDocumentFn({ caseId, docId })
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-body text-on-surface">

      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col h-full border-r border-surface-container-high bg-surface-container-low w-72 text-sm">

        {/* Header */}
        <div className="p-5 border-b border-surface-container-high">
          <div className="flex items-center gap-2 mb-4">
            <img src="https://i.imgur.com/5Sgvd5n.png" alt="Pericles" className="h-7" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
            <span className="font-headline font-bold text-on-background text-base">Pericles</span>
          </div>
          <button onClick={() => navigate('/cases')}
            className="flex items-center gap-2 text-outline hover:text-on-background text-xs mb-3 transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            My Cases
          </button>
          <h2 className="font-headline font-bold text-on-background text-base truncate">{caseName || 'Case'}</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-container-high">
          <button
            onClick={() => setSidebarTab('history')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              sidebarTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface-variant'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setSidebarTab('documents')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              sidebarTab === 'documents' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface-variant'
            }`}
          >
            Documents
          </button>
        </div>

        {/* History tab */}
        {sidebarTab === 'history' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary text-on-primary rounded-xl text-xs font-medium hover:bg-primary-dim transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-base">add</span>
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-outline text-center py-6">No conversations yet.</p>
              ) : (
                conversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeConvId}
                    onClick={() => loadConversation(conv)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Documents tab */}
        {sidebarTab === 'documents' && (
          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-outline">Files</p>
              <label className="cursor-pointer">
                <span className="material-symbols-outlined text-lg text-primary hover:text-primary-dim transition-colors">upload_file</span>
                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            {uploadStatus && (
              <div className={`mb-3 px-3 py-2 rounded-xl text-xs ${uploadStatus.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
                {uploadStatus.message}
                {uploading && (
                  <div className="mt-1.5 w-full bg-surface-container-high rounded-full h-1">
                    <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
            )}
            {docsLoading ? (
              <p className="text-xs text-outline">Loading...</p>
            ) : documents.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-outline">No documents yet.</p>
                <p className="text-xs text-outline mt-1">Upload a PDF or DOCX.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <DocumentItem key={d.id} doc={d} onDelete={handleDeleteDocument} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 flex flex-col gap-1 border-t border-surface-container-high">
          <div className="px-2 py-1 flex items-center gap-3">
            <span className="material-symbols-outlined text-lg text-outline">account_circle</span>
            <span className="text-xs text-on-surface-variant truncate">{user?.displayName || user?.email}</span>
          </div>
          <button onClick={() => signOut(auth)}
            className="text-outline px-2 py-1.5 flex items-center gap-3 text-xs hover:bg-surface-container-high transition-colors rounded-lg">
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden">
        <PortalNavbar
          active="cases"
          extraActions={
            <button
              onClick={startNewConversation}
              className="hidden md:flex items-center gap-1.5 text-xs text-outline hover:text-primary border border-surface-container-high hover:border-primary/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New chat
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 custom-scrollbar space-y-8">
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {chatLoading && (
            <div className="flex items-start gap-4 max-w-3xl">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              </div>
              <div className="chat-bubble-agent border border-surface-container-high rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
                <div className="flex space-x-1.5 items-center h-4">
                  <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 lg:px-12 py-5 border-t border-surface-container-high bg-white">
          <div className="bg-surface-container-low rounded-2xl p-2 focus-within:ring-2 ring-primary/20 transition-all shadow-sm">
            <form onSubmit={sendMessage} className="flex items-center gap-3 px-3 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this case..."
                disabled={chatLoading}
                className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline text-sm font-medium outline-none disabled:opacity-60"
              />
              <button type="submit" disabled={!input.trim() || chatLoading}
                className="bg-primary text-on-primary p-3 rounded-xl hover:bg-primary-dim transition-all flex items-center justify-center active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}