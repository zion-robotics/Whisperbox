import { motion } from 'framer-motion';
import { Lock, AlertTriangle } from 'lucide-react';

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isSentByMe }) {
  const { text, decryptionFailed, created_at } = message;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex w-full mb-2"
      style={{ justifyContent: isSentByMe ? 'flex-end' : 'flex-start' }}
    >
      {/* Spacer on sent side */}
      {isSentByMe && <div style={{ flex: '0 0 64px' }} />}

      <div
        className="flex flex-col"
        style={{
          maxWidth: '65%',
          alignItems: isSentByMe ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Bubble */}
        <div
          style={{
            background: isSentByMe
              ? 'linear-gradient(135deg, #0d2d5e, #0f3470)'
              : 'var(--bg-card)',
            border: isSentByMe
              ? '1px solid rgba(0,212,255,0.18)'
              : '1px solid var(--border-light)',
            borderRadius: isSentByMe
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px',
            padding: '10px 14px',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            boxShadow: isSentByMe
              ? '0 2px 8px rgba(0,0,0,0.3)'
              : '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          {decryptionFailed ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                [Unable to decrypt]
              </span>
            </div>
          ) : (
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-primary)', margin: 0 }}
            >
              {text}
            </p>
          )}
        </div>

        {/* Timestamp + lock */}
        <div
          className="flex items-center gap-1 mt-1"
          style={{
            flexDirection: isSentByMe ? 'row-reverse' : 'row',
            paddingLeft: isSentByMe ? 0 : '4px',
            paddingRight: isSentByMe ? '4px' : 0,
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatTime(created_at)}
          </span>
          <Lock size={9} style={{ color: 'var(--accent)', opacity: 0.5 }} />
        </div>
      </div>

      {/* Spacer on received side */}
      {!isSentByMe && <div style={{ flex: '0 0 64px' }} />}
    </motion.div>
  );
}