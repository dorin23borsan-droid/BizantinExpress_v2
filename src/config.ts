// Configurazione per APK e Web
// Se l'app viene compilata come APK, l'indirizzo deve essere quello del server remoto.
const REMOTE_URL = "https://web-production-8676a.up.railway.app"; 

// Se siamo in un browser (non localhost), usiamo l'origine corrente. 
// Se siamo su Android/iOS o localhost, usiamo l'URL remoto.
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
      return window.location.origin;
    }
  }
  return REMOTE_URL;
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || getBaseUrl();
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || getBaseUrl();
