import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { register } from '../api/auth';
import { setupKeysForRegister } from '../crypto/keyManager';
import { useAuthStore } from '../store/authStore';

// ─── Hook to detect window size ───────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

// ─── Slide illustrations ───────────────────────────────────────────────────────

function SlideOne() {
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      <ellipse cx="200" cy="160" rx="140" ry="100" fill="rgba(37,99,235,0.08)" />
      <motion.rect x="130" y="40" width="140" height="240" rx="24"
        fill="rgba(15,31,61,0.9)" stroke="rgba(37,99,235,0.5)" strokeWidth="1.5"
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }} />
      <rect x="155" y="50" width="90" height="8" rx="4" fill="rgba(37,99,235,0.3)" />
      {[
        { x: 145, y: 80, w: 80, color: 'rgba(37,99,235,0.8)', align: 'left', delay: 0.5 },
        { x: 175, y: 110, w: 70, color: 'rgba(255,255,255,0.15)', align: 'right', delay: 0.7 },
        { x: 145, y: 140, w: 90, color: 'rgba(37,99,235,0.8)', align: 'left', delay: 0.9 },
        { x: 185, y: 170, w: 55, color: 'rgba(255,255,255,0.15)', align: 'right', delay: 1.1 },
      ].map((b, i) => (
        <motion.g key={i} initial={{ opacity: 0, x: b.align === 'left' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }} transition={{ delay: b.delay, duration: 0.4 }}>
          <rect x={b.x} y={b.y} width={b.w} height="18" rx="9" fill={b.color} />
          <rect x={b.x + 8} y={b.y + 6} width={b.w - 26} height="6" rx="3" fill="rgba(255,255,255,0.4)" />
          <circle cx={b.x + b.w - 10} cy={b.y + 9} r="5" fill="rgba(34,197,94,0.3)" />
          <rect x={b.x + b.w - 13} y={b.y + 9} width="6" height="5" rx="1" fill="rgba(34,197,94,0.8)" />
        </motion.g>
      ))}
      <motion.g animate={{ y: [-6, 6, -6] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        <circle cx="310" cy="80" r="30" fill="rgba(37,99,235,0.15)" />
        <circle cx="310" cy="80" r="22" fill="rgba(37,99,235,0.25)" stroke="rgba(37,99,235,0.6)" strokeWidth="1" />
        <path d="M302 78 C302 73 318 73 318 78 L318 87 C318 89 316 91 310 91 C304 91 302 89 302 87 Z" fill="rgba(255,255,255,0.9)" />
        <rect x="307" y="81" width="6" height="6" rx="2" fill="rgba(37,99,235,0.8)" />
        <path d="M307 81 C307 78 313 78 313 81" stroke="rgba(37,99,235,0.8)" strokeWidth="1.5" fill="none" />
      </motion.g>
      {[{ x: 90, y: 120 }, { x: 320, y: 150 }, { x: 80, y: 200 }, { x: 330, y: 220 }].map((dot, i) => (
        <motion.circle key={i} cx={dot.x} cy={dot.y} r="4" fill="rgba(37,99,235,0.6)"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.3 }} />
      ))}
    </svg>
  );
}

function SlideTwo() {
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      <ellipse cx="200" cy="170" rx="130" ry="90" fill="rgba(37,99,235,0.06)" />
      <motion.g initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.7 }}>
        <rect x="60" y="70" width="110" height="180" rx="18" fill="rgba(15,31,61,0.95)" stroke="rgba(37,99,235,0.4)" strokeWidth="1.5" />
        <rect x="80" y="82" width="70" height="6" rx="3" fill="rgba(37,99,235,0.3)" />
        {[100, 125, 150, 175].map((y, i) => (
          <motion.rect key={i} x="75" y={y} width={40 + i * 8} height="14" rx="7"
            fill="rgba(37,99,235,0.7)"
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }} />
        ))}
      </motion.g>
      <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
        {[0, 1, 2].map(i => (
          <motion.path key={i}
            d={`M 185 160 Q ${192 + i * 8} ${145 + (i % 2) * 30} ${200 + i * 8} 160`}
            stroke="rgba(34,197,94,0.8)" strokeWidth="2" fill="none"
            animate={{ pathLength: [0, 1] }}
            transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity, repeatDelay: 1 }} />
        ))}
      </motion.g>
      <motion.g initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.7 }}>
        <rect x="230" y="70" width="110" height="180" rx="18" fill="rgba(15,31,61,0.95)" stroke="rgba(37,99,235,0.4)" strokeWidth="1.5" />
        <rect x="250" y="82" width="70" height="6" rx="3" fill="rgba(37,99,235,0.3)" />
        {[100, 125, 150, 175].map((y, i) => (
          <motion.rect key={i} x={265 + (3 - i) * 5} y={y} width={45 - i * 5} height="14" rx="7"
            fill="rgba(255,255,255,0.12)"
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }} />
        ))}
      </motion.g>
      <motion.g animate={{ y: [-4, 4, -4] }} transition={{ duration: 2.5, repeat: Infinity }}>
        <rect x="155" y="265" width="90" height="28" rx="14"
          fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.5)" strokeWidth="1" />
        <circle cx="173" cy="279" r="6" fill="rgba(34,197,94,0.3)" />
        <rect x="170" y="276" width="6" height="6" rx="1" fill="rgba(34,197,94,0.9)" />
        <rect x="178" y="274" width="55" height="4" rx="2" fill="rgba(34,197,94,0.6)" />
        <rect x="178" y="281" width="40" height="4" rx="2" fill="rgba(34,197,94,0.4)" />
      </motion.g>
    </svg>
  );
}

function SlideThree() {
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      <ellipse cx="200" cy="160" rx="120" ry="90" fill="rgba(37,99,235,0.07)" />
      <motion.g animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }}>
        <motion.path
          d="M200 50 L260 75 L260 145 C260 185 200 210 200 210 C200 210 140 185 140 145 L140 75 Z"
          fill="rgba(15,31,61,0.95)" stroke="rgba(37,99,235,0.7)" strokeWidth="2"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }} />
        <path d="M200 60 L250 82 L250 142 C250 176 200 198 200 198 C200 198 150 176 150 142 L150 82 Z"
          fill="rgba(37,99,235,0.2)" />
        <rect x="187" y="118" width="26" height="22" rx="4" fill="rgba(37,99,235,0.8)" />
        <path d="M191 118 C191 109 209 109 209 118" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="200" cy="129" r="4" fill="rgba(255,255,255,0.9)" />
        <rect x="198" y="129" width="4" height="6" rx="2" fill="rgba(255,255,255,0.9)" />
      </motion.g>
      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2;
        const r = 110;
        const cx = 200 + Math.cos(angle) * r;
        const cy = 130 + Math.sin(angle) * r * 0.6;
        return (
          <motion.g key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '200px', originY: '130px' }}>
            <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}>
              <rect x={cx - 22} y={cy - 12} width="44" height="24" rx="12"
                fill="rgba(37,99,235,0.25)" stroke="rgba(37,99,235,0.5)" strokeWidth="1" />
              <rect x={cx - 14} y={cy - 5} width="20" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
              <rect x={cx - 14} y={cy + 3} width="12" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
            </motion.g>
          </motion.g>
        );
      })}
      {[{ x: 80, y: 60 }, { x: 330, y: 80 }, { x: 70, y: 240 }, { x: 320, y: 230 }].map((s, i) => (
        <motion.g key={i} animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 1.5 + i * 0.4, repeat: Infinity, delay: i * 0.6 }}>
          <line x1={s.x} y1={s.y - 8} x2={s.x} y2={s.y + 8} stroke="rgba(37,99,235,0.8)" strokeWidth="1.5" />
          <line x1={s.x - 8} y1={s.y} x2={s.x + 8} y2={s.y} stroke="rgba(37,99,235,0.8)" strokeWidth="1.5" />
        </motion.g>
      ))}
    </svg>
  );
}

const slides = [
  { illustration: <SlideOne />, title: 'Private by Design', subtitle: 'Every message encrypted before it leaves your device' },
  { illustration: <SlideTwo />, title: 'Only You Can Read It', subtitle: 'End-to-end encryption means zero server access to your chats' },
  { illustration: <SlideThree />, title: 'Your Keys, Your Control', subtitle: 'Private keys never leave your device — ever' },
];

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score, label: 'Good', color: '#eab308' };
  return { score, label: 'Strong', color: '#22c55e' };
}

// ─── Step labels (restored from v1) ──────────────────────────────────────────

const STEPS = ['Generating keys...', 'Wrapping private key...', 'Creating account...'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Register({ onSwitchToLogin }) {
  // ✅ Restored: display_name field in form state
  const [form, setForm] = useState({ username: '', display_name: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // ✅ Restored: step tracking
  const [error, setError] = useState('');
  const [slide, setSlide] = useState(0);
  const setSession = useAuthStore(s => s.setSession);
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setSlide(s => (s + 1) % slides.length), 4000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const strength = getStrength(form.password);
  const passwordsMatch = form.confirm && form.password === form.confirm;
  const passwordsMismatch = form.confirm && form.password !== form.confirm;

  // ✅ Restored: full validation from v1 (display_name + username regex)
  const validate = () => {
    if (!form.username.trim()) return 'Username is required.';
    if (form.username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_-]+$/.test(form.username)) return 'Username can only contain letters, numbers, _ and -.';
    if (!form.display_name.trim()) return 'Display name is required.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    setStep(0);

    try {
      // ✅ Restored: step progress during key generation
      const keys = await setupKeysForRegister(form.password);
      setStep(1);
      await new Promise(r => setTimeout(r, 300));
      setStep(2);

      // ✅ Restored: passing display_name + object-style call matching v1 API shape
      const data = await register({
        username: form.username.trim().toLowerCase(),
        display_name: form.display_name.trim(),
        password: form.password,
        public_key: keys.public_key,
        wrapped_private_key: keys.wrapped_private_key,
        pbkdf2_salt: keys.pbkdf2_salt,
      });

      setSession(data.user, keys.privateKey, keys.publicKey);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    padding: '14px 16px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    backdropFilter: 'blur(8px)',
  };

  const focusStyle = (e) => {
    e.target.style.border = '1px solid rgba(37,99,235,0.8)';
    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)';
    e.target.style.background = 'rgba(255,255,255,0.07)';
  };
  const blurStyle = (e) => {
    e.target.style.border = '1px solid rgba(255,255,255,0.1)';
    e.target.style.boxShadow = 'none';
    e.target.style.background = 'rgba(255,255,255,0.05)';
  };

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #060d1f 0%, #0a1628 50%, #071020 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        }} />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '100vh',
          maxHeight: '100vh',
          display: 'flex',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* ── LEFT PANEL ── */}
        {!isMobile && (
        <div style={{
          flex: '0 0 48%',
          background: 'linear-gradient(160deg, #0d1e38 0%, #0a1628 40%, #071222 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}
          >
            <img src="/logo.png" alt="WhisperBox" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span style={{ color: '#ffffff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>
              WhisperBox
            </span>
          </motion.div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <AnimatePresence mode="wait">
              <motion.div key={slide}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{ width: '100%' }}
              >
                {slides[slide].illustration}
                <motion.div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <h2 style={{ color: '#ffffff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '22px', margin: '0 0 8px' }}>
                    {slides[slide].title}
                  </h2>
                  <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                    {slides[slide].subtitle}
                  </p>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
            {slides.map((_, i) => (
              <motion.button key={i}
                onClick={() => {
                  setSlide(i);
                  clearInterval(intervalRef.current);
                  intervalRef.current = setInterval(() => setSlide(s => (s + 1) % slides.length), 4000);
                }}
                animate={{ width: i === slide ? '24px' : '8px', background: i === slide ? '#2563eb' : 'rgba(255,255,255,0.25)' }}
                transition={{ duration: 0.3 }}
                style={{ height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', padding: 0 }}
              />
            ))}
          </div>
        </div>
        )}

        {/* ── RIGHT PANEL ── */}
        <div style={{
          flex: 1,
          background: 'rgba(10,18,35,0.95)',
          backdropFilter: 'blur(20px)',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          paddingTop: '48px',
          position: 'relative',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <img src="/logo.png" alt="WhisperBox" style={{ width: '32px', height: '32px' }} />
            <span style={{ color: '#fff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px' }}>WhisperBox</span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ position: 'relative', zIndex: 1, maxWidth: '380px', width: '100%', margin: '0 auto' }}
          >
            <h2 style={{
              color: '#ffffff', fontFamily: "'Syne', sans-serif",
              fontWeight: 700, fontSize: '28px', margin: '0 0 6px', letterSpacing: '-0.5px',
            }}>
              Create account
            </h2>
            <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '14px', margin: '0 0 28px' }}>
              Already have an account?{' '}
              <button onClick={onSwitchToLogin} style={{
                color: '#3b82f6', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '14px', padding: 0,
                fontFamily: 'inherit',
              }}>
                Sign in
              </button>
            </p>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: '20px' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px', padding: '12px 16px', color: '#ef4444',
                    fontSize: '13px', borderLeft: '3px solid #ef4444',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ✅ Restored: step progress banner during loading */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: '20px' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
                    borderRadius: '10px', padding: '12px 16px', color: '#60a5fa',
                    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <Loader2 size={14} className="animate-spin" style={{ flexShrink: 0 }} />
                  {STEPS[step]}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              {/* Username */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }} style={{ marginBottom: '16px' }}>
                <label style={{ color: 'rgba(148,163,184,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                  Username
                </label>
                <input
                  type="text" value={form.username} placeholder="alice_92"
                  autoComplete="username" disabled={loading}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                />
                {/* ✅ Restored: username character validation hint */}
                <AnimatePresence>
                  {form.username && !/^[a-zA-Z0-9_-]*$/.test(form.username) && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ color: 'rgba(239,68,68,0.8)', fontSize: '12px', margin: '6px 0 0', paddingLeft: '4px' }}>
                      Only letters, numbers, _ and - allowed
                    </motion.p>
                  )}
                  {form.username && /^[a-zA-Z0-9_-]*$/.test(form.username) && form.username.trim().length < 3 && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ color: 'rgba(239,68,68,0.8)', fontSize: '12px', margin: '6px 0 0', paddingLeft: '4px' }}>
                      At least 3 characters required
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ✅ Restored: Display name field */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }} style={{ marginBottom: '16px' }}>
                <label style={{ color: 'rgba(148,163,184,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                  Display name
                </label>
                <input
                  type="text" value={form.display_name} placeholder="Alice"
                  autoComplete="name" disabled={loading}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                />
              </motion.div>

              {/* Password */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }} style={{ marginBottom: '16px' }}>
                <label style={{ color: 'rgba(148,163,184,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'} value={form.password}
                    placeholder="Min. 8 characters" autoComplete="new-password" disabled={loading}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={focusStyle} onBlur={blurStyle}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(148,163,184,0.6)',
                    cursor: 'pointer', padding: 0, display: 'flex',
                  }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength bar */}
                <AnimatePresence>
                  {form.password && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                        {[1, 2, 3, 4].map(i => (
                          <motion.div key={i}
                            animate={{ background: i <= Math.ceil(strength.score / 1.25) ? strength.color : 'rgba(255,255,255,0.1)' }}
                            transition={{ duration: 0.3 }}
                            style={{ flex: 1, height: '3px', borderRadius: '2px' }}
                          />
                        ))}
                      </div>
                      <p style={{ color: strength.color, fontSize: '12px', margin: 0, paddingLeft: '2px', fontWeight: 500 }}>
                        {strength.label}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Confirm password */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }} style={{ marginBottom: '28px' }}>
                <label style={{ color: 'rgba(148,163,184,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                  Confirm password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'} value={form.confirm}
                    placeholder="••••••••" autoComplete="new-password" disabled={loading}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    style={{
                      ...inputStyle,
                      paddingRight: '80px',
                      border: passwordsMismatch
                        ? '1px solid rgba(239,68,68,0.6)'
                        : passwordsMatch
                          ? '1px solid rgba(34,197,94,0.6)'
                          : '1px solid rgba(255,255,255,0.1)',
                    }}
                    onFocus={focusStyle} onBlur={blurStyle}
                  />

                  {/* Match indicator */}
                  <AnimatePresence>
                    {form.confirm && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        style={{ position: 'absolute', right: '44px', top: '50%', transform: 'translateY(-50%)' }}
                      >
                        {passwordsMatch
                          ? <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                          : <XCircle size={16} style={{ color: '#ef4444' }} />
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="button" onClick={() => setShowConfirm(s => !s)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(148,163,184,0.6)',
                    cursor: 'pointer', padding: 0, display: 'flex',
                  }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              {/* Submit */}
              <motion.button
                type="submit" disabled={loading}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? 'none' : '0 8px 24px rgba(37,99,235,0.4)' }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff', fontWeight: 600, fontSize: '15px',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'inherit', transition: 'background 0.2s',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
                }}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Setting up encryption...</>
                  : 'Create account'
                }
              </motion.button>
            </form>

            {/* E2EE badge */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', marginTop: '28px', paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '20px', padding: '6px 14px',
              }}>
                <ShieldCheck size={13} style={{ color: '#22c55e' }} />
                <span style={{ color: 'rgba(34,197,94,0.9)', fontSize: '12px', fontWeight: 500 }}>
                  Keys generated locally — server never sees your private key
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}