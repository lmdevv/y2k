import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import {
  AlertCircle,
  MessageSquare,
  Send,
  Sparkles,
  User,
  Video,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import LeftSidebar from '../components/LeftSidebar'

type ChatMessage = Doc<'messages'>

export const Route = createFileRoute('/chat')({
  ssr: false,
  component: ChatPage,
})

const SUGGESTIONS = [
  'Explain matrix multiplication visually',
  'Make a short video about how recursion works',
  'Show why derivatives represent slope',
  'Create a video explaining binary search',
]

function getClientSessionId() {
  const key = 'y2k-chat-session-id'
  const existing = window.localStorage.getItem(key)
  if (existing) {
    return existing
  }

  const created = crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ChatPage() {
  const [clientSessionId] = useState(() => getClientSessionId())
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const conversations = useQuery(api.chat.listConversations, { clientSessionId })
  const ensureConversation = useMutation(api.chat.ensureConversation)
  const sendMessage = useMutation(api.chat.sendMessage)
  const runVideoJob = useAction(api.daytona.runVideoJob)

  useEffect(() => {
    if (activeConversationId || conversations === undefined) {
      return
    }

    if (conversations[0]) {
      setActiveConversationId(conversations[0]._id)
      return
    }

    let cancelled = false

    void ensureConversation({ clientSessionId }).then((conversationId) => {
      if (!cancelled) {
        setActiveConversationId(conversationId)
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeConversationId, clientSessionId, conversations, ensureConversation])

  const messages = useQuery(
    api.chat.listMessages,
    activeConversationId
      ? { conversationId: activeConversationId as never }
      : ('skip' as never),
  )

  const currentConversation = useMemo(() => {
    return conversations?.find((conversation) => conversation._id === activeConversationId)
  }, [activeConversationId, conversations])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message updates only
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(text: string) {
    const prompt = text.trim()
    if (!prompt || !activeConversationId || isSending) {
      return
    }

    setIsSending(true)
    setErrorMessage(null)

    try {
      const result = await sendMessage({
        conversationId: activeConversationId as never,
        prompt,
      })
      setDraft('')

      void runVideoJob({ jobId: result.jobId }).catch((error) => {
        console.error(error)
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not send your request.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="yt-page-wide flex gap-4 px-2 py-4 sm:px-4">
      <LeftSidebar />

      <div className="min-w-0 flex-1">
        <div
          className="mb-4 flex min-h-[96px] items-center gap-4 overflow-hidden rounded-[2px] border border-[var(--yt-border)] px-6 py-4 text-white"
          style={{
            background:
              'linear-gradient(90deg, #2a6ec7 0%, #1f5aa8 40%, #153e75 100%)',
          }}
        >
          <Sparkles size={28} className="flex-shrink-0" />
          <div>
            <div className="text-[18px] font-bold italic leading-tight">
              VIDEO AGENT BETA
            </div>
            <div className="mt-1 text-[12px] leading-[1.5] text-white/90">
              Send a prompt, render inside Daytona, upload through Convex, and get
              back a watch URL.
            </div>
          </div>
        </div>

        <div className="yt-box overflow-hidden">
          <div className="flex items-center border-b border-[var(--yt-border-soft)] bg-[#fafafa]">
            <div className="border-b-2 border-[var(--yt-red)] px-4 py-2 text-[12px] font-bold text-[var(--yt-text)]">
              Chat
            </div>
            <div className="ml-auto px-4 text-[11px] text-[var(--yt-text-muted)]">
              Fresh sandbox per message
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-[var(--yt-border-soft)] bg-[#fafafa] lg:border-b-0 lg:border-r">
              <div className="border-b border-[var(--yt-border-soft)] px-3 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--yt-text-muted)]">
                  Conversation
                </div>
                <div className="mt-2 text-[12px] font-bold text-[var(--yt-text)]">
                  {currentConversation?.title ?? 'Loading...'}
                </div>
              </div>

              <div>
                {(conversations ?? []).map((conversation) => (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => setActiveConversationId(conversation._id)}
                    className={`flex w-full items-start gap-2 border-l-[3px] px-3 py-3 text-left text-[11px] leading-[1.4] hover:bg-[#ededed] ${
                      activeConversationId === conversation._id
                        ? 'border-[var(--yt-red)] bg-[#e8e8e8] font-bold text-[var(--yt-text)]'
                        : 'border-transparent text-[var(--yt-text)]'
                    }`}
                  >
                    <MessageSquare
                      size={12}
                      className="mt-[2px] flex-shrink-0 text-[var(--yt-text-soft)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-[560px] flex-col bg-white">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4"
                style={{ maxHeight: '620px' }}
              >
                {!messages ? (
                  <div className="text-[12px] text-[var(--yt-text-soft)]">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-[var(--yt-text-soft)]">
                    <Sparkles size={36} className="text-[var(--yt-border-strong)]" />
                    <p className="mt-3 text-[14px] font-bold text-[var(--yt-text)]">
                      Start a new video request
                    </p>
                    <p className="mt-1 text-[11px]">
                      The assistant will render in Daytona and reply with a watch URL.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages.map((message) => (
                      <MessageBubble key={message._id} message={message} />
                    ))}
                  </div>
                )}
              </div>

              {messages && messages.length <= 1 ? (
                <div className="border-t border-[var(--yt-border-soft)] bg-[#fafafa] px-3 py-2">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--yt-text-muted)]">
                    Try asking
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void handleSend(suggestion)}
                        className="yt-btn"
                        disabled={isSending}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSend(draft)
                }}
                className="flex items-stretch gap-2 border-t border-[var(--yt-border-soft)] bg-[#fafafa] p-3"
              >
                <label htmlFor="yt-chat-input" className="sr-only">
                  Message the video agent
                </label>
                <input
                  id="yt-chat-input"
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Describe the video you want..."
                  className="yt-search flex-1 rounded-[2px] px-2 text-[13px] text-[var(--yt-text)] outline-none"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="yt-btn yt-btn-red yt-btn-lg"
                  disabled={!draft.trim() || isSending || !activeConversationId}
                >
                  <Send size={12} /> Send
                </button>
              </form>

              {errorMessage ? (
                <div className="border-t border-[var(--yt-border-soft)] bg-[#fff5f5] px-3 py-2 text-[11px] text-[#8c0a0e]">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={12} />
                    <span>{errorMessage}</span>
                  </div>
                </div>
              ) : null}

              <div className="border-t border-[var(--yt-border-soft)] bg-[#f4f4f4] px-3 py-1 text-center text-[10px] text-[var(--yt-text-muted)]">
                Generated videos are rendered in Daytona and uploaded through Convex to
                Mux.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className="flex gap-2">
      <div
        className={`flex size-9 flex-shrink-0 items-center justify-center rounded-[2px] border text-white ${
          isUser
            ? 'border-[#1f5aa8] bg-[linear-gradient(180deg,#4a90e2_0%,#1f5aa8_100%)]'
            : 'border-[#8c0a0e] bg-[linear-gradient(180deg,#e52d27_0%,#a90a10_100%)]'
        }`}
      >
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[11px] text-[var(--yt-text-muted)]">
          <span className="font-bold text-[var(--yt-text)]">
            {isUser ? 'You' : 'Video Agent'}
          </span>{' '}
          {formatTime(message.createdAt)}
        </div>
        <div
          className={`rounded-[2px] border px-3 py-2 text-[12px] leading-[1.6] text-[var(--yt-text)] ${
            isUser
              ? 'border-[var(--yt-banner-border)] bg-[var(--yt-banner-bg)]'
              : 'border-[var(--yt-border-soft)] bg-[#fafafa]'
          }`}
        >
          {message.videoId ? (
            <Link
              to="/watch/$videoId"
              params={{ videoId: message.videoId }}
              className="inline-flex items-center gap-2 font-bold text-[var(--yt-link)] hover:underline"
            >
              <Video size={14} />
              {message.body}
            </Link>
          ) : (
            <span>{message.body}</span>
          )}

          {!isUser && message.status === 'pending' ? (
            <span className="ml-2 inline-flex items-center gap-1 align-middle">
              <span className="yt-typing-dot" />
              <span className="yt-typing-dot" style={{ animationDelay: '150ms' }} />
              <span className="yt-typing-dot" style={{ animationDelay: '300ms' }} />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
