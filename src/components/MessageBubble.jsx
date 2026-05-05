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
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-3`}
      style={{ paddingLeft: isSentByMe ? '48px' : '0', paddingRight: isSentByMe ? '0' : '48px' }}
    >
      <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: '70%', minWidth: 0 }}>
        <div
          className="px-3.5 py-2.5 rounded-2xl"
          style={{
            background: isSentByMe ? 'var(--msg-sent)' : 'var(--msg-recv)',
            border: isSentByMe
              ? '1px solid rgba(0,212,255,0.15)'
              : '1px solid var(--border)',
            borderBottomRightRadius: isSentByMe ? '4px' : '16px',
            borderBottomLeftRadius: isSentByMe ? '16px' : '4px',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          {decryptionFailed ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} style={{ color: 'var(--red)' }} />
              <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                [Unable to decrypt]
              </span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {text}
            </p>
          )}
        </div>

        {/* Time + lock */}
        <div className={`flex items-center gap-1 mt-1 px-1 ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatTime(created_at)}
          </span>
          <Lock size={9} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        </div>
      </div>
    </motion.div>
  );
}