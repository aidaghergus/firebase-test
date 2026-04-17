import { useState, useRef, useEffect } from 'react'
import { chatFn } from '../firebase.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { translations } from '../i18n/landing.js'
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

function Message({ msg, t }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary/10' : 'bg-primary-container'}`}>
        <span
          className="material-symbols-outlined text-base"
          style={!isUser
            ? { fontVariationSettings: "'FILL' 1", color: '#515d84' }
            : { color: '#515d84' }}
        >
          {isUser ? 'person' : 'smart_toy'}
        </span>
      </div>
      <div className={`space-y-1.5 max-w-[80%] ${isUser ? 'items-end' : ''}`}>
        <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-on-primary rounded-tr-none shadow-md'
            : 'bg-white border border-surface-container-high text-on-surface rounded-tl-none shadow-sm'
        }`}>
          {msg.content}
        </div>
        {msg.sources?.length > 0 && (
          <div className="px-1">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">{t.chat.sources}</p>
            {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}
        <span className="text-[10px] uppercase tracking-widest text-outline font-bold px-1 block">
          {isUser ? t.chat.you : t.chat.agent}
        </span>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { lang } = useLanguage()
  const t = translations[lang] || translations.en

  const [messages, setMessages] = useState([])
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
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const result = await chatFn({ message: userMessage.content, history })
      const { answer, sources } = result.data
      setMessages((prev) => [...prev, { role: 'model', content: answer, sources }])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { role: 'model', content: t.chat.error }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-surface font-body text-on-surface">

      <PortalNavbar active="assistant" />

      <div className="flex flex-1 overflow-hidden pt-24">

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-6 pt-8 pb-10 space-y-8">

          {/* Welcome */}
          <Message msg={{ role: 'model', content: t.chat.welcome }} t={t} />

          {messages.map((msg, i) => (
            <Message key={i} msg={msg} t={t} />
          ))}

          {loading && (
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              </div>
              <div className="bg-white border border-surface-container-high rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
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
      </div>

        {/* Input bar */}
        <div className="border-t border-surface-container-high bg-surface px-6 py-5">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high focus-within:ring-2 ring-primary/20 transition-all">
              <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.chat.placeholder}
                  disabled={loading}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline text-sm font-medium outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-primary text-on-primary p-2.5 rounded-xl hover:bg-primary-dim transition-all flex items-center justify-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </form>
            </div>
            <div className="flex gap-4 px-1">
              {t.chat.quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => setInput(action)}
                  className="text-[10px] text-outline uppercase font-bold tracking-tighter hover:text-primary transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>{/* end chat column */}

        {/* Right panel */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-surface-container-high bg-surface overflow-y-auto p-6 gap-6 shrink-0">
          <img
            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80"
            alt="Legal"
            className="w-full rounded-xl object-cover aspect-[4/3] grayscale contrast-110"
          />
          <div className="border border-surface-container-high rounded-xl p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Escalation Protocol</p>
            <p className="font-headline italic text-sm text-on-surface-variant leading-relaxed">
              "Complex legal matters may require direct human intervention for strategic counseling."
            </p>
            <button className="w-full mt-2 flex items-center justify-center gap-2 border border-primary/30 rounded-xl py-3 text-sm font-medium text-primary hover:bg-primary hover:text-on-primary transition-all duration-300">
              <span className="material-symbols-outlined text-base">support_agent</span>
              Request Real Lawyer
            </button>
          </div>
        </aside>

      </div>{/* end flex row */}
    </div>
  )
}