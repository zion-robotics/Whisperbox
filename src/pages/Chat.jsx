import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { logout } from '../api/auth';
import { getRefreshToken } from '../api/client';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';

export default function Chat() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showMobileList, setShowMobileList] = useState(true);
  const clearSession = useAuthStore(s => s.clearSession);

  useEffect(() => {
    window.__wbHandlers = window.__wbHandlers || {};
  }, []);

  const handleMessage = useCallback((msg) => {
    const handler = window.__wbHandlers[msg.from_user_id] || window.__wbHandlers[msg.to_user_id];
    if (handler) handler(msg);
    setRefreshTrigger(t => t + 1);
  }, []);

  const handlePresence = useCallback((data) => {
    setOnlineUsers(prev => {
      const next = new Set(prev);
      if (data.event === 'user.online') next.add(data.user_id);
      else next.delete(data.user_id);
      return next;
    });
  }, []);

  const { sendMessage, isConnected } = useWebSocket({
    onMessage: handleMessage,
    onPresence: handlePresence,
    enabled: true,
  });

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setShowMobileList(false);
  };

  const handleBack = () => {
    setShowMobileList(true);
    setSelectedUser(null);
  };

  const handleLogout = async () => {
    try { await logout(getRefreshToken()); } finally { clearSession(); }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div className={`shrink-0 w-full md:w-72 lg:w-80 h-full border-r flex flex-col ${showMobileList ? 'flex' : 'hidden md:flex'}`}
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedUserId={selectedUser?.id}
            onSelectUser={handleSelectUser}
            onlineUsers={onlineUsers}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '11px 14px' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className={`flex-1 h-full overflow-hidden relative ${!showMobileList ? 'flex' : 'hidden md:flex'}`}>
        <AnimatePresence mode="wait">
          {selectedUser ? (
            <motion.div key={selectedUser.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="w-full h-full">
              <MessageThread recipient={selectedUser} sendMessageWS={sendMessage}
                isWSConnected={isConnected} onBack={handleBack} />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4"
              style={{ background: 'var(--bg-primary)' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.15)' }}>
                <ShieldCheck size={36} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Select a conversation
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All messages are end-to-end encrypted</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
