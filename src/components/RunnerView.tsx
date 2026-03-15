import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Clock, Package } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { OrderCard } from './OrderCard';

interface RunnerViewProps {
  orders: Order[];
  onUpdateStatus: (id: number, status: OrderStatus) => void;
  runnerId: number;
  view: 'active' | 'history';
  onUpdateStatusWithPhoto: (id: number, status: OrderStatus, photo: string) => void;
}

export function RunnerView({ orders, onUpdateStatus, runnerId, view, onUpdateStatusWithPhoto }: RunnerViewProps) {
  const availableOrders = orders.filter(o => o.status === 'pending');
  const myActiveOrders = orders.filter(o => o.status === 'assigned' && String(o.runner_id) === String(runnerId));
  const myHistoryOrders = orders.filter(o => o.status === 'completed' && String(o.runner_id) === String(runnerId));

  const [capturingPhotoFor, setCapturingPhotoFor] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, orderId: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdateStatusWithPhoto(orderId, 'completed', base64String);
        setCapturingPhotoFor(null);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef}
        onChange={(e) => capturingPhotoFor && handlePhotoCapture(e, capturingPhotoFor)}
      />

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
                  hidePrice
                  showNavigation
                  actions={
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          setCapturingPhotoFor(order.id);
                          fileInputRef.current?.click();
                        }}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                      >
                        <Camera size={18} />
                        FOTO E CONSEGNA
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(order.id, 'completed')}
                        className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                      >
                        CONSEGNA SENZA FOTO
                      </button>
                    </div>
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
                  hidePrice
                  actions={
                    <button 
                      onClick={() => onUpdateStatus(order.id, 'assigned')}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                    >
                      <Package size={18} />
                      PRENDI IN CARICO
                    </button>
                  }
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {myHistoryOrders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Nessun ordine completato</p>
            </div>
          ) : (
            myHistoryOrders.map(order => (
              <OrderCard key={order.id} order={order} hidePrice />
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
