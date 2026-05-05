import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: null,
  privateKey: null,   // CryptoKey — never serialized
  publicKey: null,    // CryptoKey
  isAuthenticated: false,

  setSession: (user, privateKey, publicKey) => set({
    user,
    privateKey,
    publicKey,
    isAuthenticated: true,
  }),

  clearSession: () => set({
    user: null,
    privateKey: null,
    publicKey: null,
    isAuthenticated: false,
  }),

  getPrivateKey: () => get().privateKey,
  getPublicKey: () => get().publicKey,
  getUser: () => get().user,
}));
