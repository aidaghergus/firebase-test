import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { chatFn, auth } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import PortalNavbar from '../components/PortalNavbar.jsx'

function SourceBadge({ source }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="mt-1 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-primary hover:underline font-medium"
      >
        {source.name} {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <p className="mt-1 p-2 bg-surface-container rounded-lg text-on-surface-variant leading-relaxed italic">
          {source.excerpt}
        </p>
      )}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-surface-container-highest' : 'bg-primary-container'}`}>
        <span className="material-symbols-outlined text-lg" style={!isUser ? { fontVariationSettings: "'FILL' 1", color: '#515d84' } : { color: '#2a3439' }}>
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>
      <div className={`space-y-2 ${isUser ? 'text-right' : ''}`}>
        <div className={`p-5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-on-primary rounded-tr-none shadow-lg'
            : 'chat-bubble-agent border border-surface-container-high text-on-surface rounded-tl-none'
        }`}>
          {msg.content}
        </div>
        {msg.sources?.length > 0 && (
          <div className="px-1">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Sources</p>
            {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}
        <span className="text-[10px] uppercase tracking-widest text-outline font-bold px-1">
          {isUser ? 'You' : 'Pericles Agent'}
        </span>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user, role } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: 'Good day! I am Pericles, your legal assistant. I can answer questions based on the documents available in the knowledge base. How can I help you?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e) {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const history = newMessages.slice(1, -1).map((m) => ({ role: m.role, content: m.content }))
      const result = await chatFn({ message: userMessage.content, history })
      const { answer, sources } = result.data
      setMessages([...newMessages, { role: 'model', content: answer, sources }])
    } catch (err) {
      console.error(err)
      setMessages([...newMessages, { role: 'model', content: 'An error occurred. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleQuickAction(text) {
    setInput(text)
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
              <Link to="/app" className="bg-white text-on-background rounded-r-full py-3 px-6 shadow-sm font-semibold flex items-center gap-3 hover:translate-x-1 transition-transform">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                Legal Assistant
              </Link>
            </li>
            <li>
              <Link to="/cases" className="text-outline px-6 py-3 flex items-center gap-3 hover:bg-surface-container-high transition-colors hover:translate-x-1 hover:text-on-background">
                <span className="material-symbols-outlined">folder_open</span>
                My Cases
              </Link>
            </li>
            {role === 'admin' && (
            <li>
              <Link to="/admin" className="text-outline px-6 py-3 flex items-center gap-3 hover:bg-surface-container-high transition-colors hover:translate-x-1 hover:text-on-background">
                <span className="material-symbols-outlined">folder_managed</span>
                Document Vault
              </Link>
            </li>
            )}
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

        <PortalNavbar active="assistant" />

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 custom-scrollbar space-y-8">
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}
          {loading && (
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

        {/* Input */}
        <div className="px-6 lg:px-12 py-5 border-t border-surface-container-high bg-white">
          <div className="bg-surface-container-low rounded-2xl p-2 focus-within:ring-2 ring-primary/20 transition-all shadow-sm">
            <form onSubmit={sendMessage} className="flex items-center gap-3 px-3 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your legal query or ask to analyze a document..."
                disabled={loading}
                className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline text-sm font-medium outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-primary text-on-primary p-3 rounded-xl hover:bg-primary-dim transition-all flex items-center justify-center active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </form>
          </div>
          <div className="flex gap-4 mt-3 px-2">
            {['Summarize latest document', 'What are the key risks?', 'Find relevant clauses'].map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="text-[10px] text-outline uppercase font-bold tracking-tighter hover:text-primary transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
