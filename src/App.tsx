import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Package, 
  Phone, 
  User, 
  ChevronRight,
  Bell,
  LogOut,
  History,
  Info,
  Zap,
  Map as MapIcon,
  Camera,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import L from 'leaflet';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL, SOCKET_URL } from './config';
import { Order, Message, OrderStatus, OrderType, User as UserType } from './types';
import { MosaicLogo } from './components/MosaicLogo';
import { NavButton } from './components/NavButton';
import { ChatWindow } from './components/ChatWindow';
import { LoginView } from './components/LoginView';
import { MerchantView } from './components/MerchantView';
import { RunnerView } from './components/RunnerView';
import { AdminView } from './components/AdminView';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bx_token'));
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string, msg: string }[]>([]);
  const [toasts, setToasts] = useState<{ id: string, message: string, type: 'error' | 'success' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('bx_biometric_enabled') === 'true');

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // --- Auth Logic ---
  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Errore ${res.status}: Impossibile accedere`);
      }
      
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('bx_token', data.token);
      
      // If biometric was previously enabled, update the stored token
      if (biometricEnabled) {
        localStorage.setItem('bx_biometric_token', data.token);
      }

      addToast("Accesso effettuato con successo", "success");
      return true;
    } catch (err: any) {
      addToast(err.message);
      return false;
    }
  };

  const biometricLogin = async () => {
    const storedToken = localStorage.getItem('bx_biometric_token');
    if (!storedToken) {
      addToast("Biometria non configurata su questo dispositivo");
      return false;
    }

    setLoading(true);
    try {
      // Verify the stored token
      const res = await fetch(`${API_BASE_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      
      if (!res.ok) {
        localStorage.removeItem('bx_biometric_token');
        throw new Error("Sessione biometrica scaduta");
      }

      const userData = await res.json();
      setToken(storedToken);
      setUser(userData);
      localStorage.setItem('bx_token', storedToken);
      addToast("Accesso biometrico completato", "success");
      setLoading(false);
      return true;
    } catch (err: any) {
      addToast(err.message);
      setLoading(false);
      return false;
    }
  };

  const toggleBiometric = () => {
    const newState = !biometricEnabled;
    setBiometricEnabled(newState);
    localStorage.setItem('bx_biometric_enabled', String(newState));
    if (newState && token) {
      localStorage.setItem('bx_biometric_token', token);
      addToast("Accesso biometrico attivato per questo dispositivo", "success");
    } else {
      localStorage.removeItem('bx_biometric_token');
      addToast("Accesso biometrico disattivato");
    }
  };

  const register = async (username: string, password: string, role: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, name }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Errore ${res.status}: Impossibile registrarsi`);
      }
      
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('bx_token', data.token);
      addToast("Registrazione completata con successo", "success");
      return true;
    } catch (err: any) {
      addToast(err.message);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('bx_token');
    if (socket) socket.disconnect();
  };

  // --- API Wrapper ---
  const authFetch = async (url: string, options: any = {}) => {
    try {
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      const res = await fetch(fullUrl, { ...options, headers });
      
      if (res.status === 401 || res.status === 403) {
        logout();
        addToast("Sessione scaduta o non autorizzata. Effettua nuovamente l'accesso.");
        return null;
      }

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) throw new Error(`Errore ${res.status}: ${text || 'Risposta non valida dal server'}`);
        return text;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Errore ${res.status}: Operazione fallita`);
      }

      return data;
    } catch (err: any) {
      addToast(err.message);
      return null;
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const init = async () => {
      const userData = await authFetch('/api/me');
      if (userData) {
        setUser(userData);
        const orderData = await authFetch('/api/orders');
        if (orderData) setOrders(orderData);

        const newSocket = io(SOCKET_URL, {
          auth: { token }
        });
        setSocket(newSocket);

        newSocket.on('order:new', (order: Order) => {
          setOrders(prev => {
            if (prev.some(o => o.id === order.id)) return prev;
            return [order, ...prev];
          });
          addNotification(`Nuovo ordine da ${order.merchant_name}!`);
        });

        newSocket.on('order:completed', (order: Order) => {
          setOrders(prev => prev.map(o => o.id === order.id ? order : o));
          addNotification(`Consegna completata per ${order.recipient_name}!`);
        });

        newSocket.on('order:updated', (order: Order) => {
          setOrders(prev => prev.map(o => o.id === order.id ? order : o));
        });

        newSocket.on('receive_message', (message: Message) => {
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
          if (!chatOpen) {
            addNotification(`Nuovo messaggio da ${message.username}`);
          }
        });

        // Fetch initial messages
        const msgRes = await fetch(`${API_BASE_URL}/api/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData);
        }
      }
      setLoading(false);
    };

    init();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token]);

  const addNotification = (msg: string) => {
    const id = `note-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [{ id, msg }, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    const newOrder = await authFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    if (newOrder) {
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      addToast("Ordine creato con successo!", "success");
    }
  };

  const handleUpdateStatus = async (id: number, status: OrderStatus) => {
    const updatedOrder = await authFetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (updatedOrder) {
      setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
      addToast(`Stato ordine aggiornato: ${status}`, "success");
    }
  };

  const sendMessage = (content: string) => {
    if (!socket || !content.trim() || !user) return;
    socket.emit('send_message', {
      user_id: user.id,
      username: user.name,
      role: user.role,
      content: content.trim()
    });
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo ordine?")) return;
    const res = await authFetch(`/api/orders/${id}`, {
      method: 'DELETE',
    });
    if (res && res.success) {
      setOrders(prev => prev.filter(o => o.id !== id));
      addToast("Ordine eliminato correttamente", "success");
    }
  };

  const [view, setView] = useState<'active' | 'history'>('active');

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#FDFCF8] p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-6"
        >
          <MosaicLogo className="w-24 h-24 rounded-3xl shadow-2xl" />
          <div className="text-center">
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">BX DELIVERY</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Caricamento sistema...</p>
          </div>
          <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-full h-full bg-amber-500"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={login} onRegister={register} onBiometricLogin={biometricLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#FDFCF8] overflow-hidden">
      {/* App Bar */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-50 pt-safe">
        <div className="flex items-center gap-3">
          <MosaicLogo className="w-8 h-8 rounded-xl" />
          <h1 className="text-lg font-black text-slate-800 tracking-tight">BX DELIVERY</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={20} className="text-slate-400" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 active:scale-90 transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Notifications Overlay */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10"
            >
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <p className="text-sm font-medium">{note.msg}</p>
            </motion.div>
          ))}
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border pointer-events-auto",
                toast.type === 'error' 
                  ? "bg-red-50 text-red-800 border-red-100" 
                  : "bg-emerald-50 text-emerald-800 border-emerald-100"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full",
                toast.type === 'error' ? "bg-red-500" : "bg-emerald-500"
              )} />
              <p className="text-sm font-bold">{toast.message}</p>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-auto text-current opacity-50 hover:opacity-100"
              >
                <LogOut size={14} className="rotate-180" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-32 px-4">
        <div className="max-w-2xl mx-auto pt-6">
          <div className="mb-6 flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
            <MosaicLogo className="w-10 h-10" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bentornato,</p>
              <p className="font-black text-slate-800 truncate">{user.name}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button 
                onClick={toggleBiometric}
                className={cn(
                  "p-2 rounded-xl transition-all active:scale-90",
                  biometricEnabled ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
                )}
                title="Attiva/Disattiva Biometria"
              >
                <ShieldCheck size={20} />
              </button>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase tracking-widest">
                {user.role === 'admin' ? 'Responsabile' : user.role === 'merchant' ? 'Negozio' : 'Runner'}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {user.role === 'merchant' && (
              <MerchantView orders={orders} onCreateOrder={handleCreateOrder} view={view} />
            )}
            {user.role === 'runner' && (
              <RunnerView 
                orders={orders} 
                onUpdateStatus={handleUpdateStatus} 
                runnerId={user.id} 
                view={view} 
                socket={socket}
                onUpdateStatusWithPhoto={(id, status, photo) => {
                authFetch(`/api/orders/${id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status, delivery_photo: photo }),
                }).then(updatedOrder => {
                  if (updatedOrder) {
                    setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
                    addToast(`Consegna completata con foto!`, "success");
                  }
                });
              }} />
            )}
            {user.role === 'admin' && (
              <AdminView 
                orders={orders} 
                onUpdateStatus={handleUpdateStatus} 
                onDeleteOrder={handleDeleteOrder} 
                view={view} 
                socket={socket}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-2 flex items-center justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-[env(safe-area-inset-bottom,16px)]">
        <NavButton 
          active={view === 'active'} 
          onClick={() => setView('active')} 
          icon={Package} 
          label="Ordini" 
        />
        <NavButton 
          active={view === 'history'} 
          onClick={() => setView('history')} 
          icon={History} 
          label="Storico" 
        />
        <div className="relative">
          <button 
            onClick={() => setChatOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90",
              chatOpen ? "text-amber-600" : "text-slate-400"
            )}
          >
            <Bell size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
            {messages.length > 0 && (
              <span className="absolute top-0 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </nav>

      {/* Chat Window */}
      <AnimatePresence>
        {chatOpen && (
          <ChatWindow 
            messages={messages} 
            onClose={() => setChatOpen(false)} 
            onSend={sendMessage}
            currentUser={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
