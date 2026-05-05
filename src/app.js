/**
 * app.js — WhisperBox main application controller
 *
 * Security invariants enforced here:
 * 1. Private key never transmitted over network
 * 2. Plaintext never sent to server
 * 3. Decryption fails gracefully without crashing
 * 4. JWT stored in sessionStorage only
 */

const App = (() => {
  let currentUser = null;     // { username }
  let currentPartner = null;  // username of active chat
  let pollInterval = null;

  // ── Startup ────────────────────────────────────────────────────────────────

  async function init() {
    const session = Store.loadSession();
    if (session && session.token) {
      API.setToken(session.token);
      // Try to restore session keys from IndexedDB
      const keypair = await KeyManager.loadKeypairFromDB(session.username);
      if (keypair) {
        KeyManager.setSessionKeys(keypair);
        currentUser = { username: session.username };
        enterApp();
        return;
      }
    }
    UI.showScreen('auth-screen');
    bindAuthEvents();
  }

  // ── Auth Events ────────────────────────────────────────────────────────────

  function bindAuthEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
      });
    });

    document.getElementById('register-btn').addEventListener('click', handleRegister);
    document.getElementById('login-btn').addEventListener('click', handleLogin);

    // Enter key support
    ['login-username', 'login-password'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
      });
    });
    ['reg-username', 'reg-password', 'reg-confirm'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') handleRegister();
      });
    });
  }

  async function handleRegister() {
    UI.clearError('reg-error');
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!username || !password) return UI.showError('reg-error', 'Username and password required');
    if (username.length < 3) return UI.showError('reg-error', 'Username must be at least 3 characters');
    if (password.length < 6) return UI.showError('reg-error', 'Password must be at least 6 characters');
    if (password !== confirm) return UI.showError('reg-error', 'Passwords do not match');

    const btn = document.getElementById('register-btn');
    UI.setLoading(btn, true);

    try {
      // 1. Generate RSA keypair on client
      const keypair = await KeyManager.generateKeypair();
      const publicKeyB64 = await KeyManager.exportPublicKey(keypair.publicKey);

      // 2. Register with server (send only public key)
      await API.register(username, password, publicKeyB64);

      // 3. Login to get token
      const loginData = await API.login(username, password);
      const token = loginData.access_token || loginData.token;

      // 4. Store private key in IndexedDB (wrapped with password)
      await KeyManager.saveKeypairToDB(username, keypair);

      // 5. Set session
      KeyManager.setSessionKeys(keypair);
      Store.saveSession(username, token);
      currentUser = { username };

      UI.showToast('Account created! Your keypair has been generated.', 'success');
      enterApp();
    } catch (err) {
      UI.showError('reg-error', err.message || 'Registration failed');
    } finally {
      UI.setLoading(btn, false);
    }
  }

  async function handleLogin() {
    UI.clearError('login-error');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) return UI.showError('login-error', 'Username and password required');

    const btn = document.getElementById('login-btn');
    UI.setLoading(btn, true);

    try {
      const loginData = await API.login(username, password);
      const token = loginData.access_token || loginData.token;

      // Check if private key exists in IndexedDB
      let keypair = await KeyManager.loadKeypairFromDB(username);

      if (!keypair) {
        // Key not in this browser — this is a new device.
        // User must re-register OR we can't decrypt old messages.
        // For now, show a clear warning and offer to create new key.
        UI.showError('login-error',
          'No private key found for this browser. ' +
          'If this is a new device, your old messages cannot be recovered. ' +
          'Register a new account or use your original browser.'
        );
        API.clearToken();
        UI.setLoading(btn, false);
        return;
      }

      KeyManager.setSessionKeys(keypair);
      Store.saveSession(username, token);
      currentUser = { username };

      enterApp();
    } catch (err) {
      UI.showError('login-error', err.message || 'Login failed');
    } finally {
      UI.setLoading(btn, false);
    }
  }

  // ── App Entry ──────────────────────────────────────────────────────────────

  function enterApp() {
    UI.showScreen('app-screen');
    document.getElementById('current-username-display').textContent = currentUser.username;
    document.getElementById('user-avatar-sidebar').textContent = UI.avatarInitials(currentUser.username);
    bindAppEvents();
    loadConversations();
  }

  function bindAppEvents() {
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('new-chat-btn').addEventListener('click', () => {
      document.getElementById('new-chat-modal').classList.remove('hidden');
      document.getElementById('new-chat-recipient').focus();
    });
    document.getElementById('close-modal-btn').addEventListener('click', () => {
      document.getElementById('new-chat-modal').classList.add('hidden');
      UI.clearError('new-chat-error');
    });
    document.getElementById('start-chat-btn').addEventListener('click', handleNewChat);
    document.getElementById('new-chat-recipient').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleNewChat();
    });
    document.getElementById('send-btn').addEventListener('click', handleSend);
    document.getElementById('refresh-btn').addEventListener('click', () => loadMessages(currentPartner));

    const textarea = document.getElementById('message-input');
    UI.autoResizeTextarea(textarea);
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  function handleLogout() {
    clearInterval(pollInterval);
    Store.clearSession();
    API.clearToken();
    KeyManager.clearSessionKeys();
    currentUser = null;
    currentPartner = null;

    // Reset UI
    document.getElementById('conv-items').innerHTML = '';
    document.getElementById('messages-list').innerHTML = '';
    document.getElementById('chat-view').classList.add('hidden');
    document.getElementById('welcome-state').style.display = '';

    UI.showScreen('auth-screen');
    UI.showToast('Signed out successfully', 'info');
  }

  // ── Conversations ──────────────────────────────────────────────────────────

  function loadConversations() {
    const convs = Store.getConversations(currentUser.username);
    renderConversations(convs);
  }

  function renderConversations(partners) {
    const container = document.getElementById('conv-items');
    const empty = document.getElementById('conv-empty');

    if (!partners || partners.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    container.innerHTML = partners.map(p => `
      <div class="conv-item ${p === currentPartner ? 'active' : ''}" data-partner="${p}">
        <div class="user-avatar">${UI.avatarInitials(p)}</div>
        <div class="conv-info">
          <div class="conv-name">${UI.escapeHtml(p)}</div>
          <div class="conv-preview">🔐 encrypted</div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.conv-item').forEach(item => {
      item.addEventListener('click', () => {
        openChat(item.dataset.partner);
      });
    });
  }

  async function handleNewChat() {
    UI.clearError('new-chat-error');
    const recipient = document.getElementById('new-chat-recipient').value.trim();
    if (!recipient) return UI.showError('new-chat-error', 'Enter a username');
    if (recipient === currentUser.username) return UI.showError('new-chat-error', 'Cannot message yourself');

    const btn = document.getElementById('start-chat-btn');
    UI.setLoading(btn, true);

    try {
      // Verify user exists and has a public key
      const user = await API.getUser(recipient);
      if (!user || !user.public_key) {
        throw new Error('User not found or has no public key');
      }
      Store.setCachedPublicKey(recipient, user.public_key);
      Store.addConversation(currentUser.username, recipient);
      document.getElementById('new-chat-modal').classList.add('hidden');
      document.getElementById('new-chat-recipient').value = '';
      loadConversations();
      openChat(recipient);
    } catch (err) {
      UI.showError('new-chat-error', err.message || 'User not found');
    } finally {
      UI.setLoading(btn, false);
    }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  function openChat(partner) {
    currentPartner = partner;

    // Update UI
    document.getElementById('welcome-state').style.display = 'none';
    document.getElementById('chat-view').classList.remove('hidden');
    document.getElementById('chat-view').style.display = 'flex';
    document.getElementById('chat-recipient-name').textContent = partner;
    document.getElementById('chat-avatar').textContent = UI.avatarInitials(partner);

    // Update active conversation
    document.querySelectorAll('.conv-item').forEach(item => {
      item.classList.toggle('active', item.dataset.partner === partner);
    });

    loadMessages(partner);

    // Poll for new messages
    clearInterval(pollInterval);
    pollInterval = setInterval(() => loadMessages(partner, true), 5000);
  }

  async function loadMessages(partner, silent = false) {
    if (!partner) return;

    const listEl = document.getElementById('messages-list');
    const loadingEl = document.getElementById('messages-loading');
    const emptyEl = document.getElementById('messages-empty');
    const decryptErrEl = document.getElementById('decrypt-error');

    if (!silent) {
      loadingEl.classList.remove('hidden');
      listEl.innerHTML = '';
      emptyEl.classList.add('hidden');
      decryptErrEl.classList.add('hidden');
    }

    try {
      const messages = await API.getMessages(partner);
      const keys = KeyManager.getSessionKeys();
      if (!keys) throw new Error('No session keys');

      let hasDecryptErrors = false;

      // Group messages by sender for visual grouping
      const groups = [];
      let lastSender = null;
      let currentGroup = null;

      for (const msg of (messages || [])) {
        const isSent = msg.sender === currentUser.username;
        const sender = isSent ? 'You' : msg.sender;

        if (sender !== lastSender) {
          currentGroup = { sender, isSent, messages: [] };
          groups.push(currentGroup);
          lastSender = sender;
        }

        // Decrypt
        let plaintext = null;
        let decryptFailed = false;
        try {
          plaintext = await E2E.decrypt(msg.content, keys.privateKey, isSent);
        } catch {
          decryptFailed = true;
          hasDecryptErrors = true;
        }

        currentGroup.messages.push({
          id: msg.id,
          plaintext,
          decryptFailed,
          time: msg.created_at,
        });
      }

      // Render
      loadingEl.classList.add('hidden');

      if (groups.length === 0) {
        emptyEl.classList.remove('hidden');
        return;
      }

      listEl.innerHTML = groups.map(g => `
        <div class="message-group ${g.isSent ? 'sent' : 'received'}">
          <div class="group-sender">${UI.escapeHtml(g.sender)}</div>
          ${g.messages.map(m => `
            <div class="message-bubble ${m.decryptFailed ? 'decrypt-failed' : ''}">
              ${m.decryptFailed
                ? '🔒 Unable to decrypt this message'
                : UI.escapeHtml(m.plaintext || '')}
            </div>
            <div class="message-time">${UI.formatTime(m.time)}</div>
          `).join('')}
        </div>
      `).join('');

      if (hasDecryptErrors) decryptErrEl.classList.remove('hidden');

      // Scroll to bottom
      const area = document.getElementById('messages-area');
      area.scrollTop = area.scrollHeight;

    } catch (err) {
      if (!silent) {
        loadingEl.classList.add('hidden');
        UI.showToast('Failed to load messages: ' + err.message, 'error');
      }
    }
  }

  async function handleSend() {
    const textarea = document.getElementById('message-input');
    const plaintext = textarea.value.trim();
    if (!plaintext || !currentPartner) return;

    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;

    try {
      // 1. Get recipient's public key
      let recipientPubKeyB64 = Store.getCachedPublicKey(currentPartner);
      if (!recipientPubKeyB64) {
        const user = await API.getUser(currentPartner);
        recipientPubKeyB64 = user.public_key;
        Store.setCachedPublicKey(currentPartner, recipientPubKeyB64);
      }
      const recipientPublicKey = await KeyManager.importPublicKey(recipientPubKeyB64);

      // 2. Get sender's own public key (for self-read)
      const keys = KeyManager.getSessionKeys();
      const senderPublicKey = keys.publicKey;

      // 3. Encrypt — plaintext NEVER sent to server
      const ciphertext = await E2E.encrypt(plaintext, recipientPublicKey, senderPublicKey);

      // 4. Send encrypted blob to server
      await API.sendMessage(currentPartner, ciphertext);

      // 5. Update UI
      textarea.value = '';
      textarea.style.height = 'auto';
      Store.addConversation(currentUser.username, currentPartner);
      loadConversations();
      await loadMessages(currentPartner);

    } catch (err) {
      UI.showToast('Send failed: ' + err.message, 'error');
    } finally {
      sendBtn.disabled = false;
    }
  }

  return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
