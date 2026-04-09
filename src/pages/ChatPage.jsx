import { useState, useRef, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { chatFn, auth } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'

function SourceBadge({ source }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="mt-1 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-blue-600 hover:underline font-medium"
      >
        {source.name} {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <p className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-600 leading-relaxed italic">
          {source.excerpt}
        </p>
      )}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-blue-700 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {msg.content}
        </div>
        {msg.sources?.length > 0 && (
          <div className="mt-2 px-1 w-full">
            <p className="text-xs text-gray-400 mb-1">Sources:</p>
            {msg.sources.map((s, i) => (
              <SourceBadge key={i} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content:
        'Hello. I am your legal assistant. I can answer questions based on the documents available in the knowledge base. How can I help you?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Build history for the model (skip greeting, exclude current message)
      const history = newMessages
        .slice(1, -1)
        .map((m) => ({ role: m.role, content: m.content }))

      const result = await chatFn({ message: userMessage.content, history })
      const { answer, sources } = result.data
      setMessages([...newMessages, { role: 'model', content: answer, sources }])
    } catch (err) {
      console.error(err)
      setMessages([
        ...newMessages,
        { role: 'model', content: 'An error occurred. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Legal Assistant</h1>
            <p className="text-xs text-gray-500">Answers based on your firm's documents</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
            <button
              onClick={() => signOut(auth)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex space-x-1.5 items-center h-4">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a legal question..."
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-blue-700 text-white rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
