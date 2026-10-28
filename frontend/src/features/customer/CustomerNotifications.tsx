import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Truck,
  ShoppingBag,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import type { NotificationCategory } from '../../types';

export const CustomerNotifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useData();

  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'ALL'>('ALL');

  // Customer isolated notifications
  const customerNotifs = useMemo(() => {
    return notifications.filter(n => n.customerId === (user?.id || 'usr-cust-03'));
  }, [notifications, user?.id]);

  // Filtered by category
  const filteredNotifs = useMemo(() => {
    if (categoryFilter === 'ALL') return customerNotifs;
    return customerNotifs.filter(n => n.category === categoryFilter);
  }, [customerNotifs, categoryFilter]);

  const unreadCount = useMemo(() => {
    return customerNotifs.filter(n => !n.read).length;
  }, [customerNotifs]);

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'ORDER':
        return ShoppingBag;
      case 'SHIPMENT':
        return Truck;
      case 'VERIFICATION':
        return ShieldAlert;
      case 'DISCREPANCY':
        return AlertTriangle;
      case 'RETURN':
        return RotateCcw;
      default:
        return Bell;
    }
  };

  const getSeverityStyle = (severity?: string, read?: boolean) => {
    if (read) return 'border-slate-200 bg-white text-slate-700';
    switch (severity) {
      case 'success':
        return 'border-emerald-300 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-200';
      case 'warning':
        return 'border-amber-300 bg-amber-50/40 text-amber-950 ring-1 ring-amber-200';
      case 'error':
        return 'border-rose-300 bg-rose-50/40 text-rose-950 ring-1 ring-rose-200';
      default:
        return 'border-indigo-300 bg-indigo-50/40 text-indigo-950 ring-1 ring-indigo-200';
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Real-Time Custody & Requisition Feed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Notifications Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time delivery progress updates, verification alerts, discrepancy reviews, and invoice notices.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsAsRead(user?.id || 'usr-cust-03')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1.5 text-xs">
        {[
          { id: 'ALL', label: 'All Notifications' },
          { id: 'SHIPMENT', label: 'Shipments & Delays' },
          { id: 'ORDER', label: 'Orders & POs' },
          { id: 'VERIFICATION', label: 'Verification & Seals' },
          { id: 'DISCREPANCY', label: 'Discrepancies' },
          { id: 'RETURN', label: 'Returns & Replacements' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              categoryFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.map(notif => {
          const Icon = getCategoryIcon(notif.category);

          return (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.read) markNotificationAsRead(notif.id);
                if (notif.link) navigate(notif.link);
              }}
              className={`p-4 rounded-2xl border transition cursor-pointer hover:shadow-xs flex items-start justify-between gap-4 ${getSeverityStyle(
                notif.severity,
                notif.read
              )}`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.read
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-white text-indigo-600 border border-indigo-200 shadow-2xs'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {notif.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(notif.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {notif.link && (
                <div className="shrink-0 pt-1 text-slate-400 hover:text-indigo-600">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {filteredNotifs.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
            <Bell className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-800">
              No notifications in this category
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You are all caught up! Relevant consignment handover updates will appear here in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

