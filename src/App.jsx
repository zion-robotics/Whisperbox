import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';

export default function App() {
  const [page, setPage] = useState('login');
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  if (isAuthenticated) return <Chat />;

  return (
    <AnimatePresence mode="wait">
      {page === 'login' ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Login onSwitchToRegister={() => setPage('register')} />
        </motion.div>
      ) : (
        <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Register onSwitchToLogin={() => setPage('login')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
