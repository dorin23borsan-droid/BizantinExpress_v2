import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, History, Info, Map as MapIcon, User } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { OrderCard } from './OrderCard';
import { Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icon issue in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RunnerLocation {
  userId: number;
  userName: string;
  lat: number;
  lng: number;
  orderId?: number;
  lastUpdate: number;
}

interface AdminViewProps {
  orders: Order[];
  onUpdateStatus: (id: number, status: OrderStatus) => void;
  onDeleteOrder: (id: number) => void;
  view: 'active' | 'history';
  socket: Socket | null;
}

export function AdminView({ orders, onUpdateStatus, onDeleteOrder, view, socket }: AdminViewProps) {
  const [runnerLocations, setRunnerLocations] = useState<Record<number, RunnerLocation>>({});

  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data: RunnerLocation) => {
      setRunnerLocations(prev => ({
        ...prev,
        [data.userId]: { ...data, lastUpdate: Date.now() }
      }));
    };

    socket.on('location_updated', handleLocationUpdate);
    return () => {
      socket.off('location_updated', handleLocationUpdate);
    };
  }, [socket]);

  const activeRunners = (Object.values(runnerLocations) as RunnerLocation[]).filter(
    loc => Date.now() - loc.lastUpdate < 60000 // Only show runners active in the last minute
  );

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status !== 'completed').length,
    completed: orders.filter(o => o.status === 'completed').length,
    revenue: orders.reduce((acc, o) => acc + o.price, 0)
  }), [orders]);

  const allOrders = useMemo(() => [...orders].sort((a, b) => b.id - a.id), [orders]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-black text-slate-800">Pannello di Controllo</h2>
        <p className="text-sm text-slate-500 font-medium">Visione globale di tutte le attività</p>
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

      {activeRunners.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Mappa Runner Attivi</h3>
            <MapIcon size={16} className="text-emerald-500" />
          </div>
          <div className="h-64 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 relative z-0">
            <MapContainer 
              center={[44.4184, 12.2035]} // Ravenna center
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {activeRunners.map(runner => (
                <Marker key={runner.userId} position={[runner.lat, runner.lng]}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-slate-800">{runner.userName}</p>
                      <p className="text-[10px] text-slate-500">Runner ID: {runner.userId}</p>
                      {runner.orderId && <p className="text-[10px] text-amber-600 font-bold">Ordine #{runner.orderId}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tutti gli ordini nel sistema</h3>
          <History size={16} className="text-slate-400" />
        </div>
        {allOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <Package size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">Nessun ordine presente</p>
          </div>
        ) : (
          allOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              isAdmin 
              showNavigation
              actions={
                <button 
                  onClick={() => onDeleteOrder(order.id)}
                  className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  ELIMINA ORDINE
                </button>
              }
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
