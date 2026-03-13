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
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import L from 'leaflet';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL, SOCKET_URL } from './config';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type OrderStatus = 'pending' | 'assigned' | 'completed';
type OrderType = 'city' | 'suburb';

interface Order {
  id: number;
  merchant_name: string;
  merchant_phone: string;
  delivery_address: string;
  recipient_name: string;
  intercom: string;
  type: OrderType;
  distance: number;
  price: number;
  status: OrderStatus;
  runner_id?: string;
  created_at: string;
}

// --- Components ---

const MosaicLogo = React.memo(({ className }: { className?: string }) => (
  <div className={cn("relative w-12 h-12 overflow-hidden rounded-lg shadow-inner shrink-0", className)}>
    <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
      {[...Array(16)].map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "w-full h-full border-[0.5px] border-black/10",
            i % 5 === 0 ? "bg-amber-500" : 
            i % 3 === 0 ? "bg-blue-600" : 
            i % 2 === 0 ? "bg-emerald-600" : "bg-red-700"
          )}
        />
      ))}
    </div>
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <span className="text-white font-bold text-xs tracking-tighter">BX</span>
    </div>
  </div>
));

const NavButton = React.memo(({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-300 relative flex-1",
      active ? "text-amber-600 scale-105" : "text-slate-400"
    )}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    {active && (
      <motion.div 
        layoutId="nav-indicator" 
        className="absolute -bottom-1 w-1 h-1 bg-amber-600 rounded-full"
      />
    )}
  </button>
));

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bx_token'));
  const [orders, setOrders] = useState<Order[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'error' | 'success' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('bx_biometric_enabled') === 'true');

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type } as any]);
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Errore ${res.status}: Operazione fallita`);
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
    setNotifications(prev => [{ id, msg }, ...prev].slice(0, 5) as any);
    setTimeout(() => {
      setNotifications(prev => (prev as any).filter((n: any) => n.id !== id));
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
    <div className="h-full flex flex-col bg-[#FDFCF8] overflow-hidden">
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
          {(notifications as any).map((note: any) => (
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-safe pb-32 px-4">
        <div className="max-w-2xl mx-auto pt-6">
          <div className="mb-6 flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 shrink-0">
              <User size={20} />
            </div>
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
                {user.role}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {user.role === 'merchant' && (
              <MerchantView orders={orders} onCreateOrder={handleCreateOrder} view={view} />
            )}
            {user.role === 'runner' && (
              <RunnerView orders={orders} onUpdateStatus={handleUpdateStatus} runnerId={user.id} view={view} />
            )}
            {user.role === 'admin' && (
              <AdminView orders={orders} onUpdateStatus={handleUpdateStatus} onDeleteOrder={handleDeleteOrder} />
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
      </nav>
    </div>
  );
}

// --- Login & Registration View ---
function LoginView({ onLogin, onRegister, onBiometricLogin }: { 
  onLogin: (u: string, p: string) => Promise<boolean>,
  onRegister: (u: string, p: string, r: string, n: string) => Promise<boolean>,
  onBiometricLogin: () => Promise<boolean>
}) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('merchant');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const hasBiometric = localStorage.getItem('bx_biometric_token') !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isRegister) {
      await onRegister(username, password, role, name);
    } else {
      await onLogin(username, password);
    }
    setLoading(false);
  };

  const handleBiometric = async () => {
    setIsScanning(true);
    // Simulate biometric scan delay
    setTimeout(async () => {
      const success = await onBiometricLogin();
      if (!success) setIsScanning(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCF8] p-6">
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative"
            >
              <ShieldCheck size={80} className="text-amber-500" />
              <motion.div 
                className="absolute inset-0 border-2 border-amber-500 rounded-full"
                animate={{ scale: [1, 2], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </motion.div>
            <h3 className="mt-8 text-xl font-black tracking-tighter">Identificazione Biometrica...</h3>
            <p className="text-slate-400 text-sm font-medium mt-2">Appoggia il dito o guarda la fotocamera</p>
            <button 
              onClick={() => setIsScanning(false)}
              className="mt-12 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              Annulla
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
          <MosaicLogo className="mx-auto w-20 h-20" />
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-800">BizantinExpress</h1>
            <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mt-1">Ravenna Delivery Service</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 space-y-5 border border-slate-50">
          <h2 className="text-xl font-black text-slate-800 text-center mb-2">
            {isRegister ? "Crea un account" : "Bentornato"}
          </h2>

          {isRegister && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Nome Completo / Attività</label>
                <input 
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-amber-500 font-medium transition-all"
                  placeholder="Es: Pizzeria da Mario..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Tipo di Account</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('merchant')}
                    className={cn(
                      "py-3 rounded-xl font-bold text-sm transition-all border-2",
                      role === 'merchant' ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-slate-50 border-transparent text-slate-400"
                    )}
                  >
                    NEGOZIO
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('runner')}
                    className={cn(
                      "py-3 rounded-xl font-bold text-sm transition-all border-2",
                      role === 'runner' ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-slate-50 border-transparent text-slate-400"
                    )}
                  >
                    RUNNER
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Username</label>
            <input 
              required
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-amber-500 font-medium transition-all"
              placeholder="Scegli un username..."
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Password</label>
            <input 
              required
              type="password"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-amber-500 font-medium transition-all"
              placeholder="Scegli una password..."
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button 
              type="submit"
              disabled={loading}
              className={cn(
                "bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50",
                hasBiometric && !isRegister ? "w-3/4" : "w-full"
              )}
            >
              {loading ? "ATTENDI..." : (isRegister ? "REGISTRATI" : "ACCEDI")}
            </button>
            
            {hasBiometric && !isRegister && (
              <button 
                type="button"
                onClick={handleBiometric}
                className="w-1/4 bg-amber-500 text-white py-5 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95"
                title="Accedi con Biometria"
              >
                <ShieldCheck size={28} />
              </button>
            )}
          </div>

          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs font-bold text-amber-600 uppercase tracking-widest hover:underline"
            >
              {isRegister ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-slate-400 font-medium">
            BizantinExpress Ravenna &copy; 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// --- View Components ---

function MerchantView({ orders, onCreateOrder, view }: { orders: Order[], onCreateOrder: (data: any) => void, view: 'active' | 'history' }) {
  const [showForm, setShowForm] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [formData, setFormData] = useState({
    merchant_phone: '',
    delivery_address: '',
    recipient_name: '',
    intercom: '',
    type: 'city' as OrderType,
    distance: 0,
    lat: 0,
    lng: 0
  });

  const RAVENNA_CENTER: [number, number] = [44.4184, 12.2035];
  const CITY_RADIUS_KM = 3.5;

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'completed'), [orders]);
  const historyOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; // Distance in km
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.delivery_address.length > 5) {
        setIsGeocoding(true);
        try {
          // Add "Ravenna" to the query to improve accuracy
          const query = `${formData.delivery_address}, Ravenna, Italy`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
          const data = await res.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            const dist = calculateDistance(RAVENNA_CENTER[0], RAVENNA_CENTER[1], lat, lon);
            
            const isCity = dist <= CITY_RADIUS_KM;
            setFormData(prev => ({
              ...prev,
              lat,
              lng: lon,
              distance: Number(dist.toFixed(1)),
              type: isCity ? 'city' : 'suburb'
            }));
          }
        } catch (err) {
          console.error("Geocoding error:", err);
        } finally {
          setIsGeocoding(false);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData.delivery_address]);

  const calculatePrice = () => {
    if (formData.type === 'city') return 8;
    return 8 + (formData.distance * 0.5); 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateOrder({
      ...formData,
      price: calculatePrice(),
    });
    setShowForm(false);
    setFormData({ 
      merchant_phone: '', 
      delivery_address: '', 
      recipient_name: '', 
      intercom: '', 
      type: 'city', 
      distance: 0,
      lat: 0,
      lng: 0
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            {view === 'active' ? 'I tuoi ordini' : 'Cronologia'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {view === 'active' ? 'Gestisci le tue consegne' : 'Ordini completati nel tempo'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowForm(true)}
            className="bg-amber-600 text-white p-3 rounded-2xl shadow-lg shadow-amber-200 hover:bg-amber-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Nuova Consegna</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <LogOut size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tuo Telefono Contatto</label>
                  <input 
                    required
                    type="tel"
                    placeholder="Telefono..."
                    className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium"
                    value={formData.merchant_phone}
                    onChange={e => setFormData({ ...formData, merchant_phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Indirizzo Consegna</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      required
                      placeholder="Via Cavour, 10..."
                      className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-amber-500 font-medium"
                      value={formData.delivery_address}
                      onChange={e => setFormData({ ...formData, delivery_address: e.target.value })}
                    />
                    {isGeocoding && (
                      <div className="absolute right-3 top-3.5">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          <Clock size={18} className="text-amber-500" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analisi Percorso</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                      formData.type === 'city' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {formData.type === 'city' ? 'Area Urbana' : 'Area Extra-Urbana'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black text-slate-800">{formData.distance} <span className="text-sm font-bold text-slate-400">KM</span></p>
                      <p className="text-[9px] text-slate-400 font-medium">Distanza calcolata dal centro di Ravenna</p>
                    </div>
                    {formData.type === 'suburb' && (
                      <div className="text-right">
                        <p className="text-xs font-bold text-amber-600">+€{(formData.distance * 0.5).toFixed(2)} Extra</p>
                        <p className="text-[9px] text-slate-400">Tariffa extra applicata</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Destinatario</label>
                    <input 
                      required
                      placeholder="Nome..."
                      className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium"
                      value={formData.recipient_name}
                      onChange={e => setFormData({ ...formData, recipient_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Citofono</label>
                    <input 
                      required
                      placeholder="Rossi..."
                      className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium"
                      value={formData.intercom}
                      onChange={e => setFormData({ ...formData, intercom: e.target.value })}
                    />
                  </div>
                </div>

                {formData.type === 'suburb' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Distanza (KM)</label>
                    <input 
                      type="number"
                      required
                      placeholder="KM..."
                      className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium"
                      value={formData.distance}
                      onChange={e => setFormData({ ...formData, distance: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div className="bg-amber-50 p-4 rounded-2xl flex justify-between items-center mt-6">
                  <span className="font-bold text-amber-800">Prezzo Totale</span>
                  <span className="text-2xl font-black text-amber-600">€{calculatePrice()}</span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                >
                  ORDINA ORA
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {view === 'active' ? (
          activeOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Nessun ordine attivo</p>
            </div>
          ) : (
            activeOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          )
        ) : (
          historyOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <History size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Nessun ordine nella cronologia</p>
            </div>
          ) : (
            historyOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          )
        )}
      </div>
    </motion.div>
  );
}

function RunnerView({ orders, onUpdateStatus, runnerId, view }: { orders: Order[], onUpdateStatus: (id: number, status: OrderStatus) => void, runnerId: any, view: 'active' | 'history' }) {
  const availableOrders = orders.filter(o => o.status === 'pending');
  const myActiveOrders = orders.filter(o => o.status === 'assigned' && String(o.runner_id) === String(runnerId));
  const myHistoryOrders = orders.filter(o => o.status === 'completed' && String(o.runner_id) === String(runnerId));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            {view === 'active' ? 'Area Runner' : 'Cronologia Runner'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {view === 'active' ? 'Trova e completa le tue consegne' : 'Le tue consegne completate'}
          </p>
        </div>
      </div>

      {view === 'active' ? (
        <>
          {myActiveOrders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.2em]">In Consegna</h3>
              {myActiveOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  actions={
                    <button 
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <CheckCircle2 size={18} />
                      CONSEGNA EFFETTUATA
                    </button>
                  }
                />
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Disponibili</h3>
            {availableOrders.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Nessun ordine disponibile al momento</p>
              </div>
            ) : (
              availableOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  actions={
                    <button 
                      onClick={() => onUpdateStatus(order.id, 'assigned')}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      PRENDI CARICO
                    </button>
                  }
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Completati</h3>
          {myHistoryOrders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <History size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Nessun ordine completato ancora</p>
            </div>
          ) : (
            myHistoryOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}

function AdminView({ orders, onUpdateStatus, onDeleteOrder }: { orders: Order[], onUpdateStatus: (id: number, status: OrderStatus) => void, onDeleteOrder: (id: number) => void }) {
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    revenue: orders.reduce((acc, o) => acc + o.price, 0)
  }), [orders]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-black text-slate-800">Pannello Admin</h2>
        <p className="text-sm text-slate-500 font-medium">Monitoraggio in tempo reale</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entrate Totali</p>
          <p className="text-3xl font-black">€{stats.revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Consegne</p>
          <p className="text-3xl font-black text-slate-800">{stats.total}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{stats.pending} Attive</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{stats.completed} OK</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tutti gli ordini</h3>
          <History size={16} className="text-slate-400" />
        </div>
        {orders.map(order => (
          <OrderCard 
            key={order.id} 
            order={order} 
            isAdmin 
            actions={
              <button 
                onClick={() => onDeleteOrder(order.id)}
                className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                ELIMINA ORDINE
              </button>
            }
          />
        ))}
      </div>
    </motion.div>
  );
}

const OrderCard = React.memo(({ order, actions, isAdmin }: { order: Order, actions?: React.ReactNode, isAdmin?: boolean, key?: React.Key }) => {
  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-transform group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
            order.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
            order.status === 'assigned' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
          )}>
            {order.status === 'completed' ? <CheckCircle2 size={20} /> : <Package size={20} />}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-800 leading-tight truncate">{order.recipient_name}</h4>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1 truncate">
              <MapPin size={12} className="shrink-0" /> {order.delivery_address}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-lg font-black text-slate-800">€{order.price}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {order.type === 'city' ? 'Città' : `Extra (${order.distance}km)`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Citofono</p>
          <p className="font-bold text-slate-700 truncate">{order.intercom || '-'}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Negozio</p>
          <p className="font-bold text-slate-700 truncate">{order.merchant_name}</p>
          <p className="text-[9px] text-slate-400 font-medium">{order.merchant_phone}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(order.status === 'pending' || order.status === 'assigned') && (
          <button 
            onClick={openMaps}
            className="flex-1 bg-amber-50 text-amber-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-amber-100 transition-colors"
          >
            <Navigation size={18} />
            VAI
          </button>
        )}
        {isAdmin && (
           <div className="flex-1 bg-slate-50 text-slate-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
             <Info size={18} />
             {order.status.toUpperCase()}
           </div>
        )}
      </div>

      {actions && <div className="mt-3">{actions}</div>}
      
      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        <span>ID: #{order.id.toString().padStart(4, '0')}</span>
        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </motion.div>
  );
});
