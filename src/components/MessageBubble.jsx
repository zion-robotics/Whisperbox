import { motion } from 'framer-motion';
import { Lock, AlertTriangle, FileText, Download } from 'lucide-react';

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseContent(text) {
  if (!text) return { type: 'text', content: text };
  try {
    const parsed = JSON.parse(text);
    if (parsed.__wb_type === 'file') return { type: 'file', content: parsed };
  } catch {}
  return { type: 'text', content: text };
}

function FileContent({ file, isSentByMe }) {
  const isImage = file.mime?.startsWith('image/');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = file.data;
    a.download = file.name;
    a.click();
  };

  return (
    <div style={{ minWidth: '180px' }}>
      {isImage ? (
        <div>
          <img src={file.data} alt={file.name}
            style={{ maxWidth: '240px', maxHeight: '200px', borderRadius: '10px', display: 'block', objectFit: 'cover', cursor: 'pointer' }}
            onClick={handleDownload} />
          {file.caption && (
            <p className="text-sm mt-2" style={{ color: 'var(--text-primary)' }}>{file.caption}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleDownload} style={{ padding: '4px 0' }}>
          <div className="flex items-center justify-center shrink-0"
            style={{ width: '42px', height: '42px', borderRadius: '10px', background: isSentByMe ? 'rgba(0,212,255,0.15)' : 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.2)' }}>
            <FileText size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: '160px' }}>{file.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)} · Tap to download</p>
          </div>
          <Download size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message, isSentByMe }) {
  const { text, decryptionFailed, created_at } = message;
  const parsed = parseContent(text);
  const isFile = parsed.type === 'file';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex w-full mb-2"
      style={{ justifyContent: isSentByMe ? 'flex-end' : 'flex-start' }}
    >
      {isSentByMe && <div style={{ flex: '0 0 64px' }} />}

      <div className="flex flex-col"
        style={{ maxWidth: isFile ? '280px' : '65%', alignItems: isSentByMe ? 'flex-end' : 'flex-start' }}>

        <div style={{
          background: isSentByMe ? 'linear-gradient(135deg, #0d2d5e, #0f3470)' : 'var(--bg-card)',
          border: isSentByMe ? '1px solid rgba(0,212,255,0.18)' : '1px solid var(--border-light)',
          borderRadius: isSentByMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: isFile ? '10px 12px' : '10px 14px',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          boxShadow: isSentByMe ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.2)',
        }}>
          {decryptionFailed ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>[Unable to decrypt]</span>
            </div>
          ) : isFile ? (
            <FileContent file={parsed.content} isSentByMe={isSentByMe} />
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)', margin: 0 }}>{text}</p>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1"
          style={{ flexDirection: isSentByMe ? 'row-reverse' : 'row', paddingLeft: isSentByMe ? 0 : '4px', paddingRight: isSentByMe ? '4px' : 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(created_at)}</span>
          <Lock size={9} style={{ color: 'var(--accent)', opacity: 0.5 }} />
        </div>
      </div>

      {!isSentByMe && <div style={{ flex: '0 0 64px' }} />}
    </motion.div>
  );
}