import React from 'react';
import type { ShipmentStatus, DiscrepancyStatus, DiscrepancySeverity } from '../../types';

interface StatusBadgeProps {
  status: ShipmentStatus | DiscrepancyStatus | DiscrepancySeverity | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      // Shipment Statuses
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Ready for Dispatch':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Dispatched':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'In Transit':
        return 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse';
      case 'Received':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Verification Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Discrepancy Detected':
        return 'bg-red-50 text-red-700 border-red-200 font-bold';
      case 'Under Investigation':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Partially Delivered':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      // Discrepancy Statuses
      case 'Detected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Under Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Evidence Collected':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Resolution Proposed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Escalated':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';

      // Discrepancy Severities
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300 font-extrabold';

      // Container Status
      case 'Empty':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Assigned':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Sealed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Unsealed':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      // Returns Status
      case 'Requested':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pickup Scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Received at Hub':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Inspected':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Quarantined':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Replacement Dispatched':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-600 border-slate-200';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${sizeClasses} ${getBadgeStyle()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{status}</span>
    </span>
  );
};
