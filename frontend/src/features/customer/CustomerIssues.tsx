import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  HelpCircle,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Upload
} from 'lucide-react';
import type { ReturnCase } from '../../types';

export const CustomerIssues: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, products, createReturnRequest } = useData();
  const { user } = useAuth();

  const [selectedShipmentId, setSelectedShipmentId] = useState(shipments[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<ReturnCase['reason']>('Damaged in Transit');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ship = shipments.find(s => s.id === selectedShipmentId);
    const prod = products.find(p => p.id === selectedProductId);

    createReturnRequest(
      {
        originalShipmentId: selectedShipmentId,
        trackingNumber: ship ? ship.trackingNumber : 'TRK-UNKNOWN',
        customerId: user?.id || 'usr-cust-03',
        customerName: user?.name || 'Anusha S (BioMed)',
        productId: prod?.id || 'prod-001',
        productName: prod?.name || 'Cryo-Shield Specimen Transporter',
        quantity: Number(quantity),
        reason,
        evidencePhotos: ['/dharm_logistics_hero.jpg'],
        inspectionNotes: notes
      },
      user?.name || 'Anusha S (Customer)'
    );

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">
          Issue & Return Request Filed
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Your report has been securely registered in DHARM. The Product Owner and Trans-Express Logistics Hub have been notified to coordinate pickup and warranty replacement.
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => navigate('/customer/returns')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Track Return Progress
          </button>
          <button
            onClick={() => setSubmitted(false)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            File Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Report Delivery Issue or Damaged Goods
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Submit claim details, upload condition photos, and request courier pickup or warranty replacement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Select Order / Shipment
          </label>
          <select
            value={selectedShipmentId}
            onChange={e => setSelectedShipmentId(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {shipments.map(s => (
              <option key={s.id} value={s.id}>
                {s.trackingNumber} — Status: {s.status} (From: {s.vendorName})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Affected Product SKU
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Affected Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nature of Problem
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value as ReturnCase['reason'])}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="Damaged in Transit">Damaged in Transit (Broken glass, seal breach)</option>
            <option value="Incorrect Item Received">Incorrect Item Received (Mismatched SKU)</option>
            <option value="Defective Unit">Defective Unit (Temperature logger fail)</option>
            <option value="Customer Cancellation">Protocol Change / Return Request</option>
          </select>
        </div>

        {/* Photo Upload Simulator */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Photographic Evidence
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition">
            <Camera className="w-8 h-8 mx-auto text-slate-400 mb-1" />
            <p className="text-xs font-semibold text-slate-700">
              Attach container photo or damaged packaging picture
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Simulated photo evidence included automatically
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Detailed Issue Description
          </label>
          <textarea
            rows={3}
            required
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Explain packaging condition, time of carrier arrival, or leak details..."
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Submit Return & Replacement Claim
          </button>
        </div>
      </form>
    </div>
  );
};
