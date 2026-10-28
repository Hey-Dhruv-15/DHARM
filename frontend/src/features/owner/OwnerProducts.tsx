import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { productApi } from '../../services/productApi';
import {
  Plus,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Box,
  FileText,
  Tag,
  Layers,
  Calendar,
  CheckCircle2,
  IndianRupee,
  Package,
  RefreshCw
} from 'lucide-react';
import type { Product } from '../../types';

export const OwnerProducts: React.FC = () => {
  const navigate = useNavigate();
  const { products, deleteProduct } = useData();
  const { user, role } = useAuth();

  const [detailsModalProduct, setDetailsModalProduct] = useState<Product | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

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

  const handleGetDetails = async (product: Product) => {
    setDetailsModalProduct(product);
    setIsLoadingDetails(true);
    try {
      const liveProd = await productApi.getProduct(product.id);
      if (liveProd) {
        setDetailsModalProduct(liveProd);
      }
    } catch {
      // Kept fallback to product in state
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the catalog?`)) {
      deleteProduct(id, user?.name || 'Dhruva (Owner)', role || 'OWNER');
      setActionMenuOpenId(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action: Add Product */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => navigate('/owner/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Products Table */}
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
                          onClick={() => handleGetDetails(p)}
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
                                handleGetDetails(p);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Get Details</span>
                            </button>

                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/owner/products/new?id=${p.id}`);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit</span>
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

      {/* Product Specification & Details Modal (GET /api/products/{id}) */}
      {detailsModalProduct && (
        <Modal
          isOpen={!!detailsModalProduct}
          onClose={() => setDetailsModalProduct(null)}
          title={`Product Details: ${detailsModalProduct.name}`}
          subtitle={`SKU: ${detailsModalProduct.sku} • System ID: ${detailsModalProduct.id}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Header Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {detailsModalProduct.status || 'Active'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category</span>
                <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
                  {detailsModalProduct.category || 'General / Uncategorized'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billing Unit</span>
                <p className="text-xs font-semibold text-slate-800 mt-1">
                  {detailsModalProduct.billingUnit || 'One-time'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stock Available</span>
                <p className="text-xs font-semibold text-slate-800 mt-1">
                  {detailsModalProduct.stockQuantity ?? 100} units
                </p>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-600" />
                  Tax & Pricing Breakdown
                </span>
                <span className="text-[10px] text-slate-400 font-mono">REST: GET /api/products/{detailsModalProduct.id}</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">List Price (Excl. Taxes)</span>
                  <p className="text-base font-extrabold text-slate-900 mt-1 font-mono">
                    ₹{formatPrice(detailsModalProduct.unitPrice)}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">GST Rate Applicable</span>
                  <p className="text-base font-extrabold text-indigo-600 mt-1 font-mono">
                    {formatGst(detailsModalProduct.gstRate)}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Total Gross Price (Incl. GST)</span>
                  <p className="text-base font-extrabold text-emerald-600 mt-1 font-mono">
                    ₹{formatPrice(
                      detailsModalProduct.grossPrice !== undefined
                        ? detailsModalProduct.grossPrice
                        : detailsModalProduct.unitPrice +
                          (detailsModalProduct.unitPrice * (detailsModalProduct.gstRate ?? 18)) / 100
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Deliverables / Description */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                Deliverables & Specifications
              </span>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed min-h-[60px]">
                {detailsModalProduct.deliverables || detailsModalProduct.description || (
                  <span className="text-slate-400 italic">No additional deliverables or scope descriptions registered for this catalog item.</span>
                )}
              </div>
            </div>

            {/* System Barcode & Trace Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 font-medium">Internal Barcode / Tracking:</span>
                <p className="font-mono font-semibold text-slate-800 mt-0.5">{detailsModalProduct.barcode || detailsModalProduct.sku}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Serialized Item:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{detailsModalProduct.isSerialized ? 'Yes (Unit serial tracking active)' : 'No (Batch / SKU level)'}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailsModalProduct(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = detailsModalProduct.id;
                  setDetailsModalProduct(null);
                  navigate(`/owner/products/new?id=${id}`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Product</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
