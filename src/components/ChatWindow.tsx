import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Bell, LogOut, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Message, User } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatWindowProps {
  messages: Message[];
  onClose: () => void;
  onSend: (content: string) => void;
  currentUser: User;
}

export function ChatWindow({ messages, onClose, onSend, currentUser }: ChatWindowProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col pt-safe"
    >
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Chat Assistenza</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sempre online</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-all">
          <LogOut size={20} className="rotate-180" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300">
              <Bell size={32} />
            </div>
            <div>
              <p className="font-bold text-slate-800">Nessun messaggio</p>
              <p className="text-xs text-slate-400 font-medium">Inizia una conversazione con il responsabile</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.user_id === currentUser.id;
            return (
              <div key={msg.id || idx} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] px-4 py-3 rounded-2xl shadow-sm",
                  isMe ? "bg-amber-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                )}>
                  {!isMe && (
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-50">
                      {msg.username} • {msg.role === 'admin' ? 'Responsabile' : msg.role === 'merchant' ? 'Negozio' : 'Runner'}
                    </p>
                  )}
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                </div>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2 pb-safe">
        <input 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1 bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium text-sm"
        />
        <button 
          type="submit"
          disabled={!text.trim()}
          className="bg-amber-600 text-white p-3 rounded-xl shadow-lg shadow-amber-200 disabled:opacity-50 active:scale-95 transition-all"
        >
          <Plus size={20} className="rotate-45" />
        </button>
      </form>
    </motion.div>
  );
}
