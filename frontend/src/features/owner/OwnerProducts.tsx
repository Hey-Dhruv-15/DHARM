import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import {
  Plus,
  MoreVertical,
  QrCode,
  Edit,
  Trash2,
  Box
} from 'lucide-react';
import type { Product } from '../../types';

export const OwnerProducts: React.FC = () => {
  const navigate = useNavigate();
  const { products, deleteProduct } = useData();
  const { user, role } = useAuth();

  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Number & Currency formatting helper for Indian Rupee (₹)
  const formatPrice = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: Number.isInteger(val) ? 0 : 2
    }).format(val);
  };

  const formatGst = (rate: number | undefined | null): string => {
    if (rate === undefined || rate === null) return '18%';
    return rate === 0.1 ? '0.10%' : `${rate}%`;
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the catalog?`)) {
      deleteProduct(id, user?.name || 'Dhruva (Owner)', role || 'OWNER');
      setActionMenuOpenId(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action: Only Add Product */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => navigate('/owner/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Products Table strictly matching Image 2 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-5">PRODUCT</th>
                <th className="py-3.5 px-4">CATEGORY</th>
                <th className="py-3.5 px-4">BILLING UNIT</th>
                <th className="py-3.5 px-4">LIST PRICE</th>
                <th className="py-3.5 px-4">GST</th>
                <th className="py-3.5 px-4">TOTAL (INCL. GST)</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {products.map(p => {
                const isBlueLink = p.name.trim().toLowerCase() === 'apple';
                const computedGross =
                  p.grossPrice !== undefined
                    ? p.grossPrice
                    : p.unitPrice + (p.unitPrice * (p.gstRate ?? 18)) / 100;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* PRODUCT COLUMN */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/owner/products/new?id=${p.id}`)}
                          className={`text-left font-semibold text-xs sm:text-sm tracking-tight ${
                            isBlueLink
                              ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
                              : 'text-slate-900 hover:text-blue-600 cursor-pointer'
                          }`}
                        >
                          {p.name}
                        </button>
                      </div>
                    </td>

                    {/* CATEGORY COLUMN */}
                    <td className="py-4 px-4 text-slate-600 text-xs sm:text-sm">
                      {p.category || 'General / Uncategorized'}
                    </td>

                    {/* BILLING UNIT COLUMN */}
                    <td className="py-4 px-4 text-slate-600 text-xs sm:text-sm">
                      {p.billingUnit || 'One-time'}
                    </td>

                    {/* LIST PRICE COLUMN */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                        ₹{formatPrice(p.unitPrice)}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 font-normal mt-0.5">
                        Excl. taxes
                      </div>
                    </td>

                    {/* GST COLUMN */}
                    <td className="py-4 px-4 text-slate-600 text-xs sm:text-sm font-mono">
                      {formatGst(p.gstRate)}
                    </td>

                    {/* TOTAL (INCL. GST) COLUMN */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                        ₹{formatPrice(computedGross)}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 font-normal mt-0.5">
                        Gross Price
                      </div>
                    </td>

                    {/* STATUS COLUMN */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {p.status || 'Active'}
                      </span>
                    </td>

                    {/* ACTIONS COLUMN */}
                    <td className="py-4 px-4 text-center">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpenId(actionMenuOpenId === p.id ? null : p.id)
                          }
                          className="w-7 h-7 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer mx-auto shadow-2xs"
                          title="Actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {actionMenuOpenId === p.id && (
                          <div
                            className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1.5 z-20"
                            onMouseLeave={() => setActionMenuOpenId(null)}
                          >
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/owner/products/new?id=${p.id}`);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit Product</span>
                            </button>

                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setBarcodeModalProduct(p);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View Barcode & QR</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete / Archive</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Box className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-semibold text-slate-600 text-sm">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Register a product using Add Product button above</p>
          </div>
        )}
      </div>

      {/* Industrial Barcode & Thermal Label Modal */}
      {barcodeModalProduct && (
        <Modal
          isOpen={!!barcodeModalProduct}
          onClose={() => setBarcodeModalProduct(null)}
          title={`Industrial Label Print Preview: ${barcodeModalProduct.sku}`}
          subtitle="Ready for industrial thermal barcode and QR packaging print."
          maxWidth="sm"
        >
          <div className="space-y-4 text-center">
            <div className="p-5 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 flex flex-col items-center">
              <div className="w-36 h-28 bg-white p-3 rounded-xl shadow-2xs border border-slate-200 flex flex-col items-center justify-center">
                <div className="flex justify-between items-center h-14 w-full px-1">
                  {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3].map((w, i) => (
                    <span
                      key={i}
                      className="bg-slate-900 h-full inline-block"
                      style={{ width: `${w * 2}px` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-[10px] text-slate-800 tracking-wider mt-1">
                  {barcodeModalProduct.barcode}
                </p>
              </div>

              <p className="font-extrabold text-sm text-slate-900 mt-3">
                {barcodeModalProduct.name}
              </p>
              <p className="font-mono text-xs font-semibold text-indigo-600 mt-0.5">
                {barcodeModalProduct.sku}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                DHARM ERP • GST: {formatGst(barcodeModalProduct.gstRate)} • {barcodeModalProduct.billingUnit || 'One-time'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(barcodeModalProduct.barcode);
                  alert(`Copied barcode "${barcodeModalProduct.barcode}" to clipboard!`);
                }}
                className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Copy Barcode
              </button>
              <button
                onClick={() => setBarcodeModalProduct(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
