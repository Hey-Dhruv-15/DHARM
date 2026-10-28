import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  FileText,
  Search,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  User,
  Filter,
  Download
} from 'lucide-react';
import type { AuditEvent } from '../../types';

export const OwnerAuditLog: React.FC = () => {
  const { auditLogs } = useData();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filtered = auditLogs.filter(log => {
    const matchSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
    return matchSearch && matchEntity;
  });

  const entities = ['ALL', 'Shipment', 'Product', 'Container', 'Discrepancy', 'Scan', 'Return'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Cryptographic Audit Log & Custody Ledger
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tamper-evident, append-only history of every barcode scan, container seal, manifest dispatch, and custody handover.
          </p>
        </div>

        <button
          onClick={() => {
            const json = JSON.stringify(auditLogs, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dharm-audit-export-${Date.now()}.json`;
            a.click();
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export JSON Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search audit trail by actor, action, SKU, or tracking..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
            Entity:
          </span>
          {entities.map(ent => (
            <button
              key={ent}
              onClick={() => setEntityFilter(ent)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                entityFilter === ent
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ent}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Events List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filtered.map(log => (
            <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {log.entityType}: {log.entityId}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-semibold text-slate-700">
                    {log.actorName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({log.actorRole})
                  </span>
                </div>

                <p className="text-slate-600 text-xs sm:text-sm">
                  {log.details}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="font-mono text-xs text-slate-500">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-[11px] text-slate-400">
                  {new Date(log.timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-700">No matching audit events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
