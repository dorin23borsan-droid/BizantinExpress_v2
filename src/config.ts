// Configurazione per APK e Web
// Se l'app viene compilata come APK, l'indirizzo deve essere quello del server remoto.
// Se è in locale, usa l'origine corrente.

export const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
