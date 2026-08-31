'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getChatSessions, deleteChatSession } from '@/lib/api';
import ThemeToggle from './ThemeToggle';

export default function ChatSidebar({
  sessionId,
  onSelectSession,
  onNewChat,
  onNavigateHome,
  closable,
  onClose,
}: {
  sessionId: number | null;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
  onNavigateHome: () => void;
  closable?: boolean;
  onClose?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: sessionsData } = useQuery({ queryKey: ['chat-sessions'], queryFn: getChatSessions });
  const sessions = sessionsData?.sessions ?? [];

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteChatSession(id);
    queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
  }

  return (
    <div
      className={`h-full flex flex-col p-3 ${closable ? 'w-72' : 'w-64'}`}
      style={{ background: 'var(--bg-elevated)', borderRight: '1px solid var(--surface-border)' }}
    >
      <div className="flex items-center justify-between px-1 mb-4">
        <span className="font-display font-bold text-base" style={{ color: 'var(--primary)' }}>DocDuty</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {closable && (
            <button onClick={onClose} aria-label="Close" className="p-1">
              <svg className="w-4 h-4" fill="none" stroke="var(--text-primary)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onNavigateHome}
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-1 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <rect x="3" y="10" width="18" height="11" rx="1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
        </svg>
        Home
      </button>

      <button onClick={onNewChat} className="btn-accent w-full text-sm mb-4 flex items-center justify-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
        New Chat
      </button>

      <p className="text-[10px] font-semibold uppercase tracking-wider px-2.5 mb-1.5" style={{ color: 'var(--text-faint)' }}>
        Chats
      </p>

      <div className="flex-1 overflow-y-auto space-y-0.5">
        {sessions.map((s: any) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className="group flex items-center justify-between px-2.5 py-2 rounded-lg text-sm cursor-pointer"
            style={{
              background: sessionId === s.id ? 'var(--surface-subtle)' : 'transparent',
              color: sessionId === s.id ? 'var(--primary)' : 'var(--text-primary)',
            }}
          >
            <span className="truncate">{s.title}</span>
            <button
              onClick={(e) => handleDelete(s.id, e)}
              className="opacity-0 group-hover:opacity-100 shrink-0 ml-2"
              aria-label="Delete conversation"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="var(--text-faint)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-xs px-2.5 py-2" style={{ color: 'var(--text-faint)' }}>No conversations yet</p>
        )}
      </div>
    </div>
  );
}
