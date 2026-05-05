import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, ShieldCheck, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';
import { getMessages } from '../api/messages';
import { decryptMessage } from '../crypto/decrypt';
import { encryptMessage } from '../crypto/encrypt';
import { getUserPublicKey } from '../api/users';
import { sendMessageRest } from '../api/messages';
import { isReplayAttack } from '../crypto/encrypt';
import { useAuthStore } from '../store/authStore';
import MessageBubble from './MessageBubble';

// eslint-disable-next-line no-unused-vars
export default function MessageThread({ recipient, sendMessageWS, isWSConnected, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const oldestTimestampRef = useRef(null);

  const { getPrivateKey, getPublicKey, user } = useAuthStore();

  const decryptOne = useCallback(async (msg) => {
    const isSentByMe = msg.from_user_id === user.id;
    const result = await decryptMessage(msg.payload, getPrivateKey(), isSentByMe);
    return {
      ...msg,
      text: result.success ? result.text : null,
      decryptionFailed: !result.success,
    };
  }, [user.id, getPrivateKey]);

  const loadMessages = useCallback(async (before = null) => {
    try {
      const raw = await getMessages(recipient.id, { limit: 50, before });
      if (raw.length < 50) setHasMore(false);
      else setHasMore(true);

      if (raw.length > 0) {
        oldestTimestampRef.current = raw[raw.length - 1].created_at;
      }

      const decrypted = await Promise.all(raw.map(decryptOne));
      decrypted.reverse();

      if (before) {
        setMessages(prev => [...decrypted, ...prev]);
      } else {
        setMessages(decrypted);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, [recipient.id, decryptOne]);

  useEffect(() => {
    oldestTimestampRef.current = null;

    const init = async () => {
      setMessages([]);
      setLoading(true);
      setHasMore(false);

      try {
        await Promise.all([
          loadMessages(),
          getUserPublicKey(recipient.id).then(k => setRecipientPublicKey(k)),
        ]);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [recipient.id, loadMessages]);

  const handleIncomingMessage = useCallback(async (wsMsg) => {
    if (wsMsg.from_user_id !== recipient.id && wsMsg.to_user_id !== recipient.id) return;
    if (isReplayAttack(wsMsg.id)) return;

    const decrypted = await decryptOne(wsMsg);
    setMessages(prev => {
      if (prev.find(m => m.id === decrypted.id)) return prev;
      return [...prev, decrypted];
    });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [recipient.id, decryptOne]);

  useEffect(() => {
    if (window.__wbHandlers) window.__wbHandlers[recipient.id] = handleIncomingMessage;
    return () => { if (window.__wbHandlers) delete window.__wbHandlers[recipient.id]; };
  }, [recipient.id, handleIncomingMessage]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !recipientPublicKey) return;

    setInput('');
    setSending(true);

    try {
      const myPublicKey = getPublicKey();
      const payload = await encryptMessage(text, recipientPublicKey, myPublicKey);

      const optimistic = {
        id: `opt_${Date.now()}`,
        from_user_id: user.id,
        to_user_id: recipient.id,
        payload,
        text,
        decryptionFailed: false,
        created_at: new Date().toISOString(),
        optimistic: true,
      };
      setMessages(prev => [...prev, optimistic]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

      const sent = sendMessageWS(recipient.id, payload);
      if (!sent) {
        await sendMessageRest(recipient.id, payload);
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !oldestTimestampRef.current) return;
    setLoadingMore(true);
    await loadMessages(oldestTimestampRef.current);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Decrypting messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>

        <button onClick={onBack} className="md:hidden mr-1" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
        </button>

        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
          {recipient.display_name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{recipient.display_name}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{recipient.username}</p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,229,160,0.2)' }}>
          <ShieldCheck size={12} style={{ color: 'var(--green)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>E2EE</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ background: 'var(--bg-primary)' }}
      >
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-3 py-16"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <Lock size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Messages are end-to-end encrypted</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isSentByMe={msg.from_user_id === user.id}
              />
            ))}
          </AnimatePresence>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute right-6 bottom-20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 py-3 shrink-0 flex items-end gap-3"
        style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>

        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message (end-to-end encrypted)"
            rows={1}
            className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              maxHeight: '120px',
              lineHeight: '1.5',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <Lock size={12} className="absolute right-3 bottom-3"
            style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        </div>

        <motion.button
          onClick={handleSend}
          disabled={sending || !input.trim() || !recipientPublicKey}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #0099cc)',
            opacity: (!input.trim() || !recipientPublicKey || sending) ? 0.4 : 1,
          }}
        >
          {sending
            ? <Loader2 size={16} className="animate-spin" style={{ color: '#000' }} />
            : <Send size={16} style={{ color: '#000' }} />
          }
        </motion.button>
      </div>
    </div>
  );
}