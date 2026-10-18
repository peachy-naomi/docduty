'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { sendChatMessage, getChatSession, getToken, startSubscription } from '@/lib/api';
import { useRouter as useRouterAlias } from 'next/navigation';
import ChatSidebar from '@/components/ChatSidebar';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string; options?: string[] };

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  useEffect(() => {
    const urlSessionId = searchParams.get('session');
    if (urlSessionId) loadSession(Number(urlSessionId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function loadSession(id: number) {
    setSessionId(id);
    setMessages([]);
    setMobileSidebarOpen(false);
    try {
      const data = await getChatSession(id);
      setMessages(data.messages);
    } catch {
      setError('Could not load this conversation.');
    }
  }

  function startNewChat() {
    setSessionId(null);
    setMessages([]);
    setError('');
    setMobileSidebarOpen(false);
    router.push('/chat');
  }

  async function handleSend(e: React.FormEvent, retryMessage?: string) {
    e.preventDefault();
    const userMessage = retryMessage || input.trim();
    if (!userMessage || loading) return;

    if (!retryMessage) {
      setInput('');
      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    }
    setError('');
    setLoading(true);

    try {
      const data = await sendChatMessage(userMessage, sessionId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, options: data.options }]);
      if (!sessionId) {
        setSessionId(data.session_id);
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      }
      setLastFailedMessage('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
      setLastFailedMessage(userMessage);
    } finally {
      setLoading(false);
    }
 }

  function handleRetry() {
    if (lastFailedMessage) {
      handleSend({ preventDefault: () => {} } as React.FormEvent, lastFailedMessage);
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex h-screen">
      <aside className="hidden md:block shrink-0">
        <ChatSidebar
          sessionId={sessionId}
          onSelectSession={loadSession}
          onNewChat={startNewChat}
          onNavigateHome={() => router.push('/dashboard')}
        />
      </aside>

      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--surface-border)' }}
        aria-label="Open menu"
      >
        <svg className="w-4 h-4" fill="none" stroke="var(--text-primary)" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute left-0 top-0 h-full"
            >
              <ChatSidebar
                sessionId={sessionId}
                onSelectSession={loadSession}
                onNewChat={startNewChat}
                onNavigateHome={() => router.push('/dashboard')}
                closable
                onClose={() => setMobileSidebarOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex justify-center min-w-0 h-screen overflow-hidden">
        <div className="w-full max-w-4xl flex flex-col h-full px-6">
          <div className="flex-1 overflow-y-auto py-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center px-6 py-24">
                <p className="font-display text-2xl font-semibold mb-3">How can I help?</p>
                <p className="text-base mb-8 max-w-md" style={{ color: 'var(--text-muted)' }}>
                  Ask me to create an invoice, calculate VAT, check your deadlines, or explain a compliance requirement.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    'What is VAT on ₦150,000?',
                    'What deadlines do I have coming up?',
                    'Create an invoice for a client',
                    'What documents do I need for a contractor?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-left text-sm p-4 rounded-xl transition-transform hover:-translate-y-0.5"
                      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`px-4 py-2.5 text-sm ${
                          msg.role === 'user' ? 'chat-bubble-user whitespace-pre-wrap' : 'chat-bubble-ai chat-markdown'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            components={{
                              a: (props) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }} />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === 'assistant' && msg.options && msg.options.length > 0 && i === messages.length - 1 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => {
                                setInput(opt);
                                setTimeout(() => {
                                  const form = document.querySelector('form');
                                  form?.requestSubmit();
                                }, 0);
                              }}
                              className="text-xs font-medium px-3 py-1.5 rounded-full"
                              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="chat-bubble-ai px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full ai-thinking-dot" style={{ background: 'var(--accent)' }} />
                    <span className="w-1.5 h-1.5 rounded-full ai-thinking-dot" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full ai-thinking-dot" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="pb-4 w-full">
             {error && error.includes('Free tier limit') && (
              <div className="flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-lg mb-3" style={{ color: 'var(--warning)', background: 'rgba(217,119,6,0.08)' }}>
                <span>{error}</span>
                <button
                  onClick={async () => {
                    const data = await startSubscription();
                    window.location.href = data.payment_url;
                  }}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--warning)', color: 'white' }}
                >
                  Upgrade
                </button>
              </div>
            )}

            {error && !error.includes('Free tier limit') && (
              <div className="flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-lg mb-3" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
                <span>{error}</span>
                <button
                  onClick={handleRetry}
                  aria-label="Retry"
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(220,38,38,0.15)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="var(--danger)" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1 4v6h6M23 20v-6h-6" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                  </svg>
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2 items-end">
             <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as any);
                }
             }}
             placeholder="Ask DocDuty anything..."
             className="input-field resize-none"
             style={{ maxHeight: '150px', minHeight: '46px' }}
             rows={1}
             onInput={(e) => {
               const el = e.currentTarget;
               el.style.height = 'auto';
               el.style.height = Math.min(el.scrollHeight, 150) + 'px';
             }}
             disabled={loading}
           />
           <button type="submit" disabled={loading || !input.trim()} className="btn-accent shrink-0">
            Send
           </button>
         </form>
          </div>
        </div>
      </main>
    </div>
  );
}
