import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  alert?: boolean;
  alertText?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-indigo-50',
  iconColor = 'text-indigo-600',
  trend,
  alert,
  alertText,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl border p-5 transition-all duration-200 shadow-xs ${
        onClick
          ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5'
          : ''
      } ${alert ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/80'}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </p>
        </div>

        <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend || alertText) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500">{subtitle}</span>}

          {trend && (
            <div className="flex items-center gap-1 font-semibold">
              <span
                className={
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }
              >
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-slate-400 font-normal">
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {alertText && (
            <span className="font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
              {alertText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
