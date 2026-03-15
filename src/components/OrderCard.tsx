import React from 'react';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Package, 
  Navigation, 
  Info 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Order } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OrderCardProps {
  order: Order;
  actions?: React.ReactNode;
  isAdmin?: boolean;
  hidePrice?: boolean;
  showNavigation?: boolean;
}

export const OrderCard = React.memo(({ order, actions, isAdmin, hidePrice, showNavigation }: OrderCardProps) => {
  const openMaps = () => {
    // Usiamo l'API 'dir' (directions) per avviare la navigazione dal punto GPS attuale
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}&travelmode=driving`;
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
        {!hidePrice && (
          <div className="text-right shrink-0 ml-2">
            <p className="text-lg font-black text-slate-800">€{order.price}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {order.type === 'city' ? 'Città' : `Extra (${order.distance}km)`}
            </p>
          </div>
        )}
      </div>

      {order.delivery_photo && (
        <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100">
          <img src={order.delivery_photo} alt="Consegna" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data e Orario</p>
          <div className="flex flex-col gap-0.5">
            <p className="font-bold text-slate-700 truncate flex items-center gap-1">
              <Clock size={12} className="text-amber-500" />
              {order.delivery_slot || '-'}
            </p>
            {order.delivery_date && (
              <p className="text-[10px] font-bold text-slate-500 ml-4">
                {new Date(order.delivery_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Citofono</p>
          <p className="font-bold text-slate-700 truncate">{order.intercom || '-'}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl col-span-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Negozio</p>
          <div className="flex justify-between items-center">
            <p className="font-bold text-slate-700 truncate">{order.merchant_name}</p>
            <p className="text-[9px] text-slate-400 font-medium">{order.merchant_phone}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {showNavigation && (order.status === 'pending' || order.status === 'assigned') && (
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
        <span>
          {(() => {
            // Gestione formato SQLite (YYYY-MM-DD HH:MM:SS) vs ISO
            const dateStr = order.created_at;
            const normalizedDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
            return new Date(normalizedDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          })()}
        </span>
      </div>
    </motion.div>
  );
});
