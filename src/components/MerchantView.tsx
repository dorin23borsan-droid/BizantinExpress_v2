import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LogOut, MapPin, Clock, Package, History } from 'lucide-react';
import { Order, OrderType, OrderStatus } from '../types';
import { OrderCard } from './OrderCard';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MerchantViewProps {
  orders: Order[];
  onCreateOrder: (data: any) => void;
  view: 'active' | 'history';
}

export function MerchantView({ orders, onCreateOrder, view }: MerchantViewProps) {
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
    lng: 0,
    delivery_slot: '08:00',
    delivery_date: new Date().toISOString().split('T')[0]
  });

  const slots = useMemo(() => {
    const s = [];
    for (let h = 8; h <= 13; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 13 && m > 0) break;
        s.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    for (let h = 15; h <= 19; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 19 && m > 0) break;
        s.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return s;
  }, []);

  const RAVENNA_CENTER: [number, number] = [44.4184, 12.2035];
  const CITY_RADIUS_KM = 3.5;

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'completed'), [orders]);
  const historyOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);

  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c;
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.delivery_address.length > 5) {
        setIsGeocoding(true);
        try {
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
      lng: 0,
      delivery_slot: '08:00',
      delivery_date: new Date().toISOString().split('T')[0]
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
                  <LogOut size={20} className="rotate-180" />
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
                      <p className="text-2xl font-black text-slate-800">{formData.distance} <span className="text-sm font-bold text-slate-400">km</span></p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Distanza dal centro</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-amber-600">€{calculatePrice()}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tariffa stimata</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Destinatario</label>
                  <input 
                    required
                    placeholder="Nome e Cognome..."
                    className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium"
                    value={formData.recipient_name}
                    onChange={e => setFormData({ ...formData, recipient_name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Citofono / Note</label>
                  <input 
                    placeholder="Es: Interno 4, Scala B..."
                    className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium"
                    value={formData.intercom}
                    onChange={e => setFormData({ ...formData, intercom: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Consegna</label>
                    <input 
                      required
                      type="date"
                      className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-bold text-slate-700"
                      value={formData.delivery_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Orario (Lun-Sab)</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-bold text-slate-700"
                      value={formData.delivery_slot}
                      onChange={e => setFormData({ ...formData, delivery_slot: e.target.value })}
                    >
                      {slots.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
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
