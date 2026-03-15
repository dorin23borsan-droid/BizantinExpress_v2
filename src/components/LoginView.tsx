import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { MosaicLogo } from './MosaicLogo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoginViewProps {
  onLogin: (u: string, p: string) => Promise<boolean>;
  onRegister: (u: string, p: string, r: string, n: string) => Promise<boolean>;
  onBiometricLogin: () => Promise<boolean>;
}

export function LoginView({ onLogin, onRegister, onBiometricLogin }: LoginViewProps) {
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
                className="w-1/4 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-100 active:scale-95 transition-all"
              >
                <ShieldCheck size={32} />
              </button>
            )}
          </div>

          <button 
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-center text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors"
          >
            {isRegister ? "Hai già un account? Accedi" : "Nuovo qui? Crea un account"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
