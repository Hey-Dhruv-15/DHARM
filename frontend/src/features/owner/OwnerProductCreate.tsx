import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types';

interface OwnerProductCreateProps {
  onBack?: () => void;
  editProductId?: string | null;
}

export const OwnerProductCreate: React.FC<OwnerProductCreateProps> = ({
  onBack,
  editProductId
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { products, addProduct, updateProduct } = useData();
  const { user, role } = useAuth();

  const productIdToEdit = editProductId || searchParams.get('id');
  const existingProduct = productIdToEdit ? products.find(p => p.id === productIdToEdit) : null;

  // Form states
  const [name, setName] = useState(existingProduct?.name || '');
  const [sku, setSku] = useState(existingProduct?.sku || '');
  const [category, setCategory] = useState(existingProduct?.category || '');
  const [billingUnit, setBillingUnit] = useState(existingProduct?.billingUnit || '');
  const [currency, setCurrency] = useState(existingProduct?.currency || 'INR');
  const [listPrice, setListPrice] = useState<string>(
    existingProduct?.unitPrice !== undefined ? String(existingProduct.unitPrice) : ''
  );
  const [gstRate, setGstRate] = useState<string>(
    existingProduct?.gstRate !== undefined ? String(existingProduct.gstRate) : '18'
  );
  const [deliverables, setDeliverables] = useState(
    existingProduct?.deliverables || existingProduct?.description || ''
  );
  const [error, setError] = useState<string | null>(null);

  // Sync if editing an existing product
  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name || '');
      setSku(existingProduct.sku || '');
      setCategory(existingProduct.category || '');
      setBillingUnit(existingProduct.billingUnit || '');
      setCurrency(existingProduct.currency || 'INR');
      setListPrice(String(existingProduct.unitPrice ?? ''));
      setGstRate(String(existingProduct.gstRate ?? '18'));
      setDeliverables(existingProduct.deliverables || existingProduct.description || '');
    }
  }, [existingProduct]);

  // Pricing calculations
  const parsedPrice = parseFloat(listPrice) || 0;
  const parsedGst = parseFloat(gstRate) || 0;
  const gstAmount = (parsedPrice * parsedGst) / 100;
  const grossPrice = parsedPrice + gstAmount;

  // Indian Rupee number formatter
  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(val);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/owner/products');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a Product / Service Name.');
      return;
    }
    if (!sku.trim()) {
      setError('Please provide a SKU Identifier.');
      return;
    }

    const assignedCategory = category.trim() || 'General / Uncategorized';
    const assignedBilling = billingUnit.trim() || 'One-time';
    const finalBarcode = existingProduct?.barcode || `BC-${sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (existingProduct) {
      updateProduct(
        existingProduct.id,
        {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: assignedCategory,
          billingUnit: assignedBilling,
          currency,
          unitPrice: parsedPrice,
          gstRate: parsedGst,
          grossPrice: grossPrice,
          deliverables: deliverables.trim(),
          description: deliverables.trim() || existingProduct.description,
          barcode: finalBarcode
        },
        user?.name || 'Dhruva (Owner)',
        role || 'OWNER'
      );
    } else {
      addProduct(
        {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: assignedCategory,
          billingUnit: assignedBilling,
          currency,
          unitPrice: parsedPrice,
          gstRate: parsedGst,
          grossPrice: grossPrice,
          unit: 'Unit',
          barcode: finalBarcode,
          isSerialized: true,
          stockQuantity: 25,
          reorderLevel: 5,
          status: 'Active',
          deliverables: deliverables.trim(),
          description: deliverables.trim() || `${name.trim()} - Master Catalog Item`
        },
        user?.name || 'Dhruva (Owner)',
        role || 'OWNER'
      );
    }

    handleBack();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb Navigation */}
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Products Catalog</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Product Identification & Classification */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            1. Product Identification & Classification
          </h3>

          {/* Row 1: Product Name & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                PRODUCT / SERVICE NAME <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Enterprise Security Suite"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                SKU (STOCK KEEPING UNIT) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="e.g. SEC-SHIELD-ENT"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono uppercase bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Row 2: Category & Billing Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                PRODUCT CATEGORY
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition pr-10 cursor-pointer"
                >
                  <option value="">Select Category</option>
                  <option value="Enterprise Software & SaaS">Enterprise Software & SaaS</option>
                  <option value="AI, ML & Data Intelligence">AI, ML & Data Intelligence</option>
                  <option value="Cloud Infrastructure & DevOps">Cloud Infrastructure & DevOps</option>
                  <option value="IT Services">IT Services</option>
                  <option value="General / Uncategorized">General / Uncategorized</option>
                  <option value="Cold-Chain Hardware">Cold-Chain Hardware</option>
                  <option value="Laboratory Electronics">Laboratory Electronics</option>
                  <option value="Biologics">Biologics</option>
                  <option value="Consumables">Consumables</option>
                  <option value="Telematics">Telematics</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                BILLING FREQUENCY / UNIT
              </label>
              <div className="relative">
                <select
                  value={billingUnit}
                  onChange={e => setBillingUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition pr-10 cursor-pointer"
                >
                  <option value="">Select Billing Frequency</option>
                  <option value="One-time">One-time</option>
                  <option value="One-time / Per Unit">One-time / Per Unit</option>
                  <option value="Monthly Subscription">Monthly Subscription</option>
                  <option value="Monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="Annual">Annual</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Currency */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              CURRENCY
            </label>
            <div className="relative">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition pr-10 cursor-pointer"
              >
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Pricing & GST Structure */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            2. Pricing & GST Structure
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* List Price */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                LIST PRICE (EXCL. TAX) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 font-semibold text-sm">
                  ₹
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={listPrice}
                  onChange={e => setListPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 font-normal">
                Standard catalog base price before taxes.
              </p>
            </div>

            {/* GST Tax Rate */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                GST TAX RATE (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={gstRate}
                  onChange={e => setGstRate(e.target.value)}
                  placeholder="18"
                  className="w-full pl-3.5 pr-8 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 font-semibold text-sm">
                  %
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 font-normal">
                Applicable GST percentage (e.g. 18).
              </p>
            </div>
          </div>

          {/* Cyan Calculation Box */}
          <div className="rounded-xl border border-cyan-300/80 bg-cyan-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
                ESTIMATED GROSS PRICE (INCL. GST)
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 tracking-tight mt-1 font-mono">
                ₹{formatINR(grossPrice)}
              </p>
            </div>

            <div className="text-xs font-semibold text-cyan-900 font-mono sm:text-right">
              GST ({parsedGst}%): +₹{formatINR(gstAmount)}
            </div>
          </div>
        </div>

        {/* SECTION 3: Description & Deliverables */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-4">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            3. Description & Deliverables
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              SCOPE OF WORK, SLA & DELIVERABLES
            </label>
            <textarea
              rows={4}
              value={deliverables}
              onChange={e => setDeliverables(e.target.value)}
              placeholder="Detailed deliverables, support coverage, user licenses, SLA response times, and specifications..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Product</span>
          </button>
        </div>
      </form>
    </div>
  );
};
