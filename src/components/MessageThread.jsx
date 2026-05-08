import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, ShieldCheck, ChevronDown, Loader2, ArrowLeft, Smile, Paperclip, X, FileText } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { getMessages } from '../api/messages';
import { decryptMessage } from '../crypto/decrypt';
import { encryptMessage } from '../crypto/encrypt';
import { getUserPublicKey } from '../api/users';
import { sendMessageRest } from '../api/messages';
import { isReplayAttack } from '../crypto/encrypt';
import { useAuthStore } from '../store/authStore';
import MessageBubble from './MessageBubble';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const oldestTimestampRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiRef = useRef(null);

  const { getPrivateKey, getPublicKey, user } = useAuthStore();

  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      if (raw.length > 0) oldestTimestampRef.current = raw[raw.length - 1].created_at;
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
    if ((!text && !filePreview) || sending || !recipientPublicKey) return;
    setSending(true);
    setInput('');
    try {
      const myPublicKey = getPublicKey();
      let content;
      if (filePreview) {
        content = JSON.stringify({
          __wb_type: 'file',
          name: filePreview.name,
          mime: filePreview.type,
          size: filePreview.size,
          data: filePreview.dataUrl,
          caption: text || '',
        });
        setFilePreview(null);
      } else {
        content = text;
      }
      const payload = await encryptMessage(content, recipientPublicKey, myPublicKey);
      const optimistic = {
        id: `opt_${Date.now()}`,
        from_user_id: user.id,
        to_user_id: recipient.id,
        payload,
        text: content,
        decryptionFailed: false,
        created_at: new Date().toISOString(),
        optimistic: true,
      };
      setMessages(prev => [...prev, optimistic]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
      const sent = sendMessageWS(recipient.id, payload);
      if (!sent) await sendMessageRest(recipient.id, payload);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      alert('File too large. Maximum size is 512KB.');
      e.target.value = '';
      return;
    }
    const dataUrl = await fileToBase64(file);
    setFilePreview({ name: file.name, type: file.type, size: file.size, dataUrl });
    e.target.value = '';
  };

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = input.slice(0, start) + emoji + input.slice(end);
      setInput(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setInput(prev => prev + emoji);
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

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSend = (input.trim() || filePreview) && !sending && recipientPublicKey;

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
      <div className="flex items-center gap-3 shrink-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '12px 20px', minHeight: '64px' }}>
        <button onClick={onBack} className="md:hidden"
          style={{ color: 'var(--text-muted)', marginRight: '4px', flexShrink: 0 }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center justify-center text-sm font-bold shrink-0"
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a3a6e, #0d2d5e)', border: '2px solid rgba(0,212,255,0.25)', color: 'var(--accent)' }}>
          {recipient.display_name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.3 }}>{recipient.display_name}</p>
          <p className="truncate" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>@{recipient.username}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0"
          style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: '20px', padding: '4px 10px' }}>
          <ShieldCheck size={12} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green)' }}>E2EE</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto"
        style={{ background: 'var(--bg-primary)', padding: '20px 16px 8px 16px' }}>
        {hasMore && (
          <div className="flex justify-center mb-5">
            <button onClick={loadMore} disabled={loadingMore}
              className="flex items-center gap-2 text-xs"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '20px', padding: '6px 16px' }}>
              {loadingMore && <Loader2 size={12} className="animate-spin" />}
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3"
            style={{ height: '100%', paddingTop: '60px', paddingBottom: '60px' }}>
            <div className="flex items-center justify-center"
              style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <Lock size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No messages yet</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.6 }}>Messages are end-to-end encrypted</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isSentByMe={msg.from_user_id === user.id} />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} style={{ height: '8px' }} />
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center justify-center shadow-lg"
            style={{ position: 'absolute', right: '24px', bottom: '88px', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div ref={emojiRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute', bottom: '80px', left: '16px', zIndex: 50 }}>
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme="dark"
              height={380}
              width={320}
              searchPlaceholder="Search emoji..."
              previewConfig={{ showPreview: false }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview bar */}
      <AnimatePresence>
        {filePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 flex items-center gap-3"
            style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '10px 16px' }}>
            {filePreview.type.startsWith('image/') ? (
              <img src={filePreview.dataUrl} alt="preview"
                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
            ) : (
              <div className="flex items-center justify-center shrink-0"
                style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <FileText size={22} style={{ color: 'var(--accent)' }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{filePreview.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {formatFileSize(filePreview.size)} · Encrypted before sending
              </p>
            </div>
            <button onClick={() => setFilePreview(null)} style={{ color: 'var(--text-muted)', flexShrink: 0, padding: '4px' }}>
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="shrink-0 flex items-end gap-2"
        style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '10px 12px 14px 12px' }}>

        <input ref={fileInputRef} type="file" className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.mp3,.mp4"
          onChange={handleFileChange} />

        {/* Emoji button */}
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => setShowEmoji(s => !s)}
          style={{
            width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showEmoji ? 'var(--accent-dim)' : 'transparent',
            color: showEmoji ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none', marginBottom: '3px',
          }}>
          <Smile size={22} />
        </motion.button>

        {/* Attachment button */}
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: filePreview ? 'var(--accent-dim)' : 'transparent',
            color: filePreview ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none', marginBottom: '3px',
          }}>
          <Paperclip size={20} />
        </motion.button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={filePreview ? 'Add a caption...' : 'Message (end-to-end encrypted)'}
            rows={1}
            className="w-full resize-none text-sm transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '22px',
              color: 'var(--text-primary)',
              padding: '11px 18px',
              maxHeight: '120px',
              lineHeight: '1.5',
              display: 'block',
              width: '100%',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
        </div>

        {/* Send button */}
        <motion.button onClick={handleSend} disabled={!canSend}
          whileHover={{ scale: canSend ? 1.06 : 1 }}
          whileTap={{ scale: canSend ? 0.92 : 1 }}
          className="flex items-center justify-center shrink-0"
          style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #0099cc)',
            opacity: canSend ? 1 : 0.35,
            transition: 'opacity 0.2s ease',
            flexShrink: 0, border: 'none',
          }}>
          {sending
            ? <Loader2 size={18} className="animate-spin" style={{ color: '#000' }} />
            : <Send size={18} style={{ color: '#000', marginLeft: '2px' }} />
          }
        </motion.button>
      </div>
    </div>
  );
}