import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Info,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Calendar,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationItem {
  id: string;
  eventId?: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WATCH' | 'IMPORTANT' | 'CRITICAL';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
  metadata?: any;
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        if (json?.notifications) {
          setNotifications(json.notifications);
          setUnreadCount(json.unreadCount || 0);
        }
      }
    } catch (err) {
      console.warn('[NotificationCenter] Error cargando notificaciones:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 minuto polling discreto
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('[NotificationCenter] Error marcando todas leídas:', err);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('[NotificationCenter] Error marcando leída:', err);
      }
    }

    if (notif.linkUrl) {
      navigate(notif.linkUrl);
      setIsOpen(false);
    }
  };

  // Agrupar por días
  const groupNotificationsByDate = (items: NotificationItem[]) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups: { [key: string]: NotificationItem[] } = {
      'HOY': [],
      'AYER': [],
      'ANTERIORES': []
    };

    items.forEach(item => {
      const itemDate = new Date(item.createdAt).toDateString();
      if (itemDate === today) {
        groups['HOY'].push(item);
      } else if (itemDate === yesterday) {
        groups['AYER'].push(item);
      } else {
        groups['ANTERIORES'].push(item);
      }
    });

    return groups;
  };

  const groups = groupNotificationsByDate(notifications);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="p-1 rounded bg-rose-500/20 text-rose-400"><AlertOctagon size={14} /></span>;
      case 'IMPORTANT':
        return <span className="p-1 rounded bg-amber-500/20 text-amber-400"><AlertTriangle size={14} /></span>;
      case 'WATCH':
        return <span className="p-1 rounded bg-cyan-500/20 text-cyan-400"><Sparkles size={14} /></span>;
      default:
        return <span className="p-1 rounded bg-blue-500/20 text-blue-400"><Info size={14} /></span>;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Botón Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full transition-all backdrop-blur-sm shadow-sm flex items-center justify-center relative bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
        title="Centro de Notificaciones y Eventos"
      >
        <Bell size={18} className={unreadCount > 0 ? 'text-amber-500 dark:text-amber-400' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full bg-theme-gold text-slate-950 flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-white">Eventos & Notificaciones</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {unreadCount} sin leer
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors"
                title="Marcar todas como leídas"
              >
                <CheckCheck size={14} /> Todo leído
              </button>
            )}
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-3 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p>No hay eventos recientes registrados</p>
              </div>
            ) : (
              (['HOY', 'AYER', 'ANTERIORES'] as const).map(groupName => {
                const groupItems = groups[groupName];
                if (!groupItems || groupItems.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1 block">
                      {groupName}
                    </span>

                    {groupItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 border ${
                          item.isRead
                            ? 'bg-slate-950/20 border-slate-800/40 text-slate-400 hover:bg-slate-800/40'
                            : 'bg-slate-800/70 border-slate-700/80 text-slate-100 hover:bg-slate-800 shadow-sm'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getSeverityBadge(item.severity)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className={`text-xs font-semibold truncate ${item.isRead ? 'text-slate-300' : 'text-white'}`}>
                              {item.title}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                              {new Date(item.createdAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                        </div>

                        {!item.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950 text-center text-[10px] text-slate-500 flex items-center justify-between px-3">
            <span>Sistema Silencioso // Magnus Event Engine</span>
            <span className="text-emerald-400 font-mono">BCRD + FX</span>
          </div>
        </div>
      )}
    </div>
  );
};
