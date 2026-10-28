import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Modal } from '../../components/common/Modal';
import {
  User,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Star,
  AlertCircle
} from 'lucide-react';
import type { CustomerAddress, CustomerType } from '../../types';
import { validateEmail, validateMobile, validateGstin } from '../../services/customerApi';

export const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const {
    customerProfile,
    updateCustomerProfile,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
    setDefaultAddress
  } = useData();

  // Profile form state
  const [customerType, setCustomerType] = useState<CustomerType>(customerProfile.customerType);
  const [name, setName] = useState(customerProfile.name);
  const [companyName, setCompanyName] = useState(customerProfile.companyName || '');
  const [email, setEmail] = useState(customerProfile.email);
  const [mobile, setMobile] = useState(customerProfile.mobile);
  const [gstin, setGstin] = useState(customerProfile.gstin || '');

  // Billing Address state
  const [billingStreet, setBillingStreet] = useState(customerProfile.billingAddress.street);
  const [billingCity, setBillingCity] = useState(customerProfile.billingAddress.city);
  const [billingState, setBillingState] = useState(customerProfile.billingAddress.state);
  const [billingPin, setBillingPin] = useState(customerProfile.billingAddress.pinCode);
  const [billingCountry, setBillingCountry] = useState(customerProfile.billingAddress.country || 'India');

  // UI feedback state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Address Modal state
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState('');
  const [addrContactName, setAddrContactName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPin, setAddrPin] = useState('');
  const [addrInstructions, setAddrInstructions] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrModalError, setAddrModalError] = useState<string | null>(null);

  // Address Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Contact / Representative name is required.';
    if (!email.trim() || !validateEmail(email)) errors.email = 'Valid business email is required.';
    if (!mobile.trim() || !validateMobile(mobile)) errors.mobile = 'Valid 10-digit mobile number is required.';

    if (customerType === 'business') {
      if (!companyName.trim()) errors.companyName = 'Company name is required for business accounts.';
      if (gstin.trim() && !validateGstin(gstin)) {
        errors.gstin = 'Invalid GSTIN format. Must be 15 alphanumeric characters (e.g. 29AABCB1234F1Z9).';
      }
    }

    if (!billingStreet.trim()) errors.billingStreet = 'Billing street address is required.';
    if (!billingCity.trim()) errors.billingCity = 'Billing city is required.';
    if (!billingState.trim()) errors.billingState = 'Billing state is required.';
    if (!billingPin.trim() || !/^\d{6}$/.test(billingPin.trim())) errors.billingPin = 'Valid 6-digit postal PIN code is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      updateCustomerProfile(
        {
          customerType,
          name: name.trim(),
          companyName: customerType === 'business' ? companyName.trim() : undefined,
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          gstin: customerType === 'business' && gstin.trim() ? gstin.trim().toUpperCase() : undefined,
          billingAddress: {
            street: billingStreet.trim(),
            city: billingCity.trim(),
            state: billingState.trim(),
            pinCode: billingPin.trim(),
            country: billingCountry.trim()
          }
        },
        user?.name || 'Customer'
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setFormErrors({ general: err.message || 'Failed to update profile.' });
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrLabel('');
    setAddrContactName(name);
    setAddrPhone(mobile);
    setAddrStreet('');
    setAddrCity(billingCity || 'Bengaluru');
    setAddrState(billingState || 'Karnataka');
    setAddrPin('');
    setAddrInstructions('');
    setAddrIsDefault(customerProfile.savedAddresses.length === 0);
    setAddrModalError(null);
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label);
    setAddrContactName(addr.contactName);
    setAddrPhone(addr.phone);
    setAddrStreet(addr.street);
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPin(addr.pinCode);
    setAddrInstructions(addr.deliveryInstructions || '');
    setAddrIsDefault(addr.isDefault);
    setAddrModalError(null);
    setAddressModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setAddrModalError(null);

    if (!addrLabel.trim()) return setAddrModalError('Address label is required.');
    if (!addrContactName.trim()) return setAddrModalError('Contact person is required.');
    if (!addrPhone.trim() || !validateMobile(addrPhone)) return setAddrModalError('Valid 10-digit mobile number is required.');
    if (!addrStreet.trim()) return setAddrModalError('Street address is required.');
    if (!addrCity.trim()) return setAddrModalError('City is required.');
    if (!addrState.trim()) return setAddrModalError('State is required.');
    if (!addrPin.trim() || !/^\d{6}$/.test(addrPin.trim())) return setAddrModalError('Valid 6-digit postal PIN code is required.');

    try {
      if (editingAddressId) {
        updateSavedAddress(
          editingAddressId,
          {
            label: addrLabel.trim(),
            contactName: addrContactName.trim(),
            phone: addrPhone.trim(),
            street: addrStreet.trim(),
            city: addrCity.trim(),
            state: addrState.trim(),
            pinCode: addrPin.trim(),
            deliveryInstructions: addrInstructions.trim(),
            isDefault: addrIsDefault
          },
          user?.name || 'Customer'
        );
      } else {
        addSavedAddress(
          {
            label: addrLabel.trim(),
            contactName: addrContactName.trim(),
            phone: addrPhone.trim(),
            street: addrStreet.trim(),
            city: addrCity.trim(),
            state: addrState.trim(),
            pinCode: addrPin.trim(),
            deliveryInstructions: addrInstructions.trim(),
            isDefault: addrIsDefault
          },
          user?.name || 'Customer'
        );
      }

      setAddressModalOpen(false);
    } catch (err: any) {
      setAddrModalError(err.message || 'Error saving address.');
    }
  };

  const confirmDeleteAddress = () => {
    if (!addressToDelete) return;
    deleteSavedAddress(addressToDelete.id, user?.name || 'Customer');
    setDeleteModalOpen(false);
    setAddressToDelete(null);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Consignee Identity & Address Master
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Customer Profile & Delivery Preferences
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your verified organization credentials, tax identifier, and physical receiving locations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">Verified Account</span>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Profile and billing preferences saved successfully!</span>
        </div>
      )}

      {formErrors.general && (
        <div className="p-4 bg-red-50 text-red-900 rounded-2xl border border-red-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{formErrors.general}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        {/* Section 1: System-Generated Metadata (Read-Only) */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            System Identity & Authorization (Read-Only)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Customer ID
              </label>
              <input
                type="text"
                disabled
                value={customerProfile.customerId}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white text-slate-800 border border-slate-200 rounded-lg cursor-not-allowed shadow-2xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Unique immutable consignee ID</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                Account Status
              </label>
              <div className="px-3 py-2 text-xs font-bold bg-white text-emerald-700 border border-slate-200 rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{customerProfile.accountStatus}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Authorized for custody sign-off</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Account Created Date
              </label>
              <input
                type="text"
                disabled
                value={new Date(customerProfile.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
                className="w-full px-3 py-2 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-lg cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Registered since 2026</span>
            </div>
          </div>
        </div>

        {/* Section 2: Customer Type & Legal Identity */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Customer Type & Contact Details
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Customer Entity Type
            </label>
            <div className="flex gap-4">
              <label className={`flex-1 p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${customerType === 'business' ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                <input
                  type="radio"
                  name="customerType"
                  value="business"
                  checked={customerType === 'business'}
                  onChange={() => setCustomerType('business')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <Building className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="text-xs font-bold">Business / Organization</div>
                  <div className="text-[10px] text-slate-500 font-normal">Hospitals, Laboratories, Commercial Research</div>
                </div>
              </label>

              <label className={`flex-1 p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${customerType === 'individual' ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                <input
                  type="radio"
                  name="customerType"
                  value="individual"
                  checked={customerType === 'individual'}
                  onChange={() => setCustomerType('individual')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <User className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="text-xs font-bold">Individual Customer</div>
                  <div className="text-[10px] text-slate-500 font-normal">Personal clinical orders or private healthcare practitioner</div>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name / Representative Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Anusha S"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${formErrors.name ? 'border-red-400 bg-red-50/20' : 'border-slate-200'}`}
              />
              {formErrors.name && <span className="text-[11px] text-red-600 mt-1 block">{formErrors.name}</span>}
            </div>

            {customerType === 'business' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Company / Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. BioMed Advanced Research Diagnostics Pvt Ltd"
                  className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${formErrors.companyName ? 'border-red-400 bg-red-50/20' : 'border-slate-200'}`}
                />
                {formErrors.companyName && <span className="text-[11px] text-red-600 mt-1 block">{formErrors.companyName}</span>}
              </div>
            ) : (
              <div />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${formErrors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-200'}`}
                />
              </div>
              {formErrors.email && <span className="text-[11px] text-red-600 mt-1 block">{formErrors.email}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (for Courier Handover & OTP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+91 98451 22890"
                  className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${formErrors.mobile ? 'border-red-400 bg-red-50/20' : 'border-slate-200'}`}
                />
              </div>
              {formErrors.mobile && <span className="text-[11px] text-red-600 mt-1 block">{formErrors.mobile}</span>}
            </div>
          </div>

          {/* Business GSTIN Field */}
          {customerType === 'business' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN (Goods and Services Tax Identification Number)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 29AABCB1234F1Z9"
                maxLength={15}
                className={`w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${formErrors.gstin ? 'border-red-400 bg-red-50/20' : 'border-slate-200'}`}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Required for official GST B2B tax invoice and tax input credit reconciliation.
              </span>
              {formErrors.gstin && <span className="text-[11px] text-red-600 mt-1 block">{formErrors.gstin}</span>}
            </div>
          )}
        </div>

        {/* Section 3: Official Billing Address */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Registered Billing Address
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Billing Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={billingStreet}
              onChange={e => setBillingStreet(e.target.value)}
              placeholder="e.g. 4th Floor, Tech Innovation Center, Tower B"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={billingCity}
                onChange={e => setBillingCity(e.target.value)}
                placeholder="Bengaluru"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={billingState}
                onChange={e => setBillingState(e.target.value)}
                placeholder="Karnataka"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIN Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={billingPin}
                onChange={e => setBillingPin(e.target.value)}
                placeholder="560100"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                disabled
                value={billingCountry}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-100 text-slate-600 border border-slate-200 rounded-lg cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Save Profile & Tax Settings
          </button>
        </div>
      </form>

      {/* Section 4: Saved Delivery Addresses (CRUD) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Saved Delivery Addresses ({customerProfile.savedAddresses.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify warehouse gates, receiving bays, and contact individuals for courier consignments.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddAddress}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Address</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {customerProfile.savedAddresses.map(addr => (
            <div
              key={addr.id}
              className={`p-4 rounded-xl border transition relative flex flex-col justify-between ${addr.isDefault ? 'border-indigo-400 bg-indigo-50/30 ring-1 ring-indigo-300' : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditAddress(addr)}
                      title="Edit Address"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {customerProfile.savedAddresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddressToDelete(addr);
                          setDeleteModalOpen(true);
                        }}
                        title="Delete Address"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-medium text-slate-900">{addr.contactName} • {addr.phone}</p>
                  <p className="text-slate-600">{addr.street}</p>
                  <p className="text-slate-500">{addr.city}, {addr.state} - <span className="font-mono">{addr.pinCode}</span></p>
                </div>

                {addr.deliveryInstructions && (
                  <div className="mt-3 p-2.5 bg-white/80 rounded-lg border border-slate-200/80 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700 block mb-0.5">Dock Instructions:</span>
                    {addr.deliveryInstructions}
                  </div>
                )}
              </div>

              {!addr.isDefault && (
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDefaultAddress(addr.id, user?.name || 'Customer')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Set as Default Delivery Address
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add/Edit Address */}
      <Modal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
        subtitle="Manage receiving dock locations and specialized courier instructions."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAddress} className="space-y-4">
          {addrModalError && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{addrModalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Location Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addrLabel}
                onChange={e => setAddrLabel(e.target.value)}
                placeholder="e.g. Primary Receiving Dock Bay 2"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Person Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addrContactName}
                onChange={e => setAddrContactName(e.target.value)}
                placeholder="e.g. Dr. Ramesh Rao"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contact Phone (for Driver Handover) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={addrPhone}
              onChange={e => setAddrPhone(e.target.value)}
              placeholder="+91 98451 22890"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Street Address & Facility Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={addrStreet}
              onChange={e => setAddrStreet(e.target.value)}
              placeholder="e.g. BioMed Campus Bay 2, Tech Park, Hosur Road"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addrCity}
                onChange={e => setAddrCity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addrState}
                onChange={e => setAddrState(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIN Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={addrPin}
                onChange={e => setAddrPin(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Courier Delivery / Cold-Chain Gate Instructions
            </label>
            <textarea
              rows={2}
              value={addrInstructions}
              onChange={e => setAddrInstructions(e.target.value)}
              placeholder="e.g. Inspect cold-chain data logger before handover. Unload on hydraulic ramp 2."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefaultCheckbox"
              checked={addrIsDefault}
              onChange={e => setAddrIsDefault(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
            />
            <label htmlFor="isDefaultCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Set this as my default shipping & receiving address
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddressModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              {editingAddressId ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {addressToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Delivery Address"
          subtitle="Are you sure you want to remove this delivery address from your profile?"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800">
              <span className="font-bold">{addressToDelete.label}</span>
              <p className="text-red-700 mt-1">{addressToDelete.street}, {addressToDelete.city}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Keep Address
              </button>
              <button
                type="button"
                onClick={confirmDeleteAddress}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
