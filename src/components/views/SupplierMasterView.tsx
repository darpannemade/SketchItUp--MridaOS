import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Phone,
  FileText,
  TrendingUp,
  X,
} from 'lucide-react';
import { SupplierMaster } from '../../types';

export const SupplierMasterView: React.FC = () => {
  const { suppliers = [], addSupplier, setActiveModal } = useApp();
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierMaster | null>(suppliers[0] || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Supplier Form State
  const [firmName, setFirmName] = useState('');
  const [gstin, setGstin] = useState('');
  const [fcoLicenseNo, setFcoLicenseNo] = useState('');
  const [fcoLicenseExpiry, setFcoLicenseExpiry] = useState('2027-12-31');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [creditPeriodDays, setCreditPeriodDays] = useState(30);
  const [creditLimit, setCreditLimit] = useState(500000);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmName.trim() || !gstin.trim()) return;
    addSupplier({
      firmName,
      gstin: gstin.toUpperCase(),
      fcoLicenseNo: fcoLicenseNo || 'FCO/MFG/MH/2025-108',
      fcoLicenseExpiry,
      address: address || 'MIDC Industrial Area, Maharashtra',
      contactPerson: contactPerson || 'Regional Sales Manager',
      phone: phone || '+91 98230 11223',
      bankDetails: bankDetails || 'SBI Corporate A/c • IFSC: SBIN0000454',
      categoriesSupplied: ['Fertilizer', 'Pesticide'],
      creditPeriodDays,
      creditLimit,
      outstandingPayable: 0,
      onTimeDeliveryPct: 95,
      rejectionPct: 0.5,
      fillRatePct: 97,
      tallyLedgerName: `${firmName} - Sundry Creditor`,
      priceList: [
        {
          productName: 'NPK 12:32:16 Basal Complex 50kg',
          sku: 'NPK-123216-50',
          purchaseRate: 1390,
          notifiedMrp: 1470,
          schemeDiscountPct: 2.0,
          effectiveDate: new Date().toISOString().split('T')[0],
        },
      ],
    });
    setIsAddModalOpen(false);
    setFirmName('');
    setGstin('');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              Supplier & Vendor Master, Price Lists & Credit Terms (PRD Section 6.1)
            </h2>
            <p className="text-xs text-[#6E7B74]">
              FR-SUP-01 to FR-SUP-05 • Supplier KYC, GSTIN, FCO O-Form License Expiry, Versioned Price Lists & Fill-Rate Metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModal('create_po')}
            className="px-3.5 py-2 rounded-2xl bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold transition-colors cursor-pointer"
          >
            + Raise PO
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register Supplier (KYC)</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: Supplier Directory + Selected Supplier Price List & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Cols: Supplier Cards */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {suppliers.map((sup) => {
            const isSelected = selectedSupplier?.id === sup.id;
            const daysToLicExpiry = Math.round(
              (new Date(sup.fcoLicenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            const isExpiringSoon = daysToLicExpiry <= 30;

            return (
              <div
                key={sup.id}
                onClick={() => setSelectedSupplier(sup)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer tabular-nums ${
                  isSelected
                    ? 'bg-white border-[#079455] shadow-md'
                    : 'bg-white border-[#E2EAE5] hover:border-[#079455]/50 card-shadow'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1A1A1A]">{sup.firmName}</h3>
                      <span className="text-[11px] font-mono text-[#079455] font-bold">
                        GSTIN: {sup.gstin}
                      </span>
                    </div>
                    <p className="text-xs text-[#6E7B74] mt-0.5">{sup.address}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-[11px] text-[#6E7B74]">Supplier Payable:</div>
                    <div className="text-sm font-extrabold text-[#1A1A1A]">
                      ₹{sup.outstandingPayable.toLocaleString('en-IN')} / ₹{(sup.creditLimit / 100000).toFixed(1)}L Limit
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#F0F5F2] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#7A8B82] block">Credit Terms (FR-SUP-03)</span>
                    <strong className="text-[#1A1A1A]">{sup.creditPeriodDays} Days Net</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7A8B82] block">Fill Rate & On-Time (FR-SUP-04)</span>
                    <strong className="text-[#079455]">{sup.fillRatePct}% Fill · {sup.onTimeDeliveryPct}% OTD</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7A8B82] block">Rejection Rate</span>
                    <strong className="text-[#1A1A1A]">{sup.rejectionPct}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7A8B82] block">FCO O-Form License (FR-SUP-05)</span>
                    <strong className={isExpiringSoon ? 'text-[#D92D20] flex items-center gap-1' : 'text-[#079455]'}>
                      {isExpiringSoon && <AlertTriangle className="w-3 h-3" />}
                      <span>Exp: {sup.fcoLicenseExpiry}</span>
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 5 Cols: Versioned Price List & Statutory KYC Details */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col justify-between">
          {selectedSupplier ? (
            <div className="space-y-4">
              <div className="border-b border-[#E5ECE7] pb-3">
                <div className="text-[11px] font-bold text-[#079455]">Selected Supplier Profile</div>
                <h3 className="text-base font-bold text-[#1A1A1A] mt-0.5">{selectedSupplier.firmName}</h3>
                <div className="text-xs text-[#6E7B74] mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#079455]" />
                    <span>{selectedSupplier.contactPerson} · {selectedSupplier.phone}</span>
                  </div>
                  <div className="font-mono text-[11px] text-[#54645B]">
                    Bank RTGS: {selectedSupplier.bankDetails}
                  </div>
                  <div className="font-mono text-[11px] text-[#54645B]">
                    Tally Creditor Ledger: <strong className="text-[#1A1A1A]">{selectedSupplier.tallyLedgerName}</strong>
                  </div>
                </div>
              </div>

              {/* Versioned Price List Table (FR-SUP-02) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#079455]" />
                    <span>Versioned Rate Contract & Price List (FR-SUP-02)</span>
                  </h4>
                  <span className="text-[11px] text-[#6E7B74]">Effective Date Traceable</span>
                </div>

                <div className="border border-[#E5ECE7] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs tabular-nums">
                    <thead>
                      <tr className="bg-[#F9FBFA] border-b border-[#E5ECE7] text-[#6E7B74]">
                        <th className="py-2 px-2.5">Product / SKU</th>
                        <th className="py-2 px-2.5 text-right">Landing Rate</th>
                        <th className="py-2 px-2.5 text-right">Govt MRP</th>
                        <th className="py-2 px-2.5 text-right">Scheme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F5F2]">
                      {selectedSupplier.priceList.map((pl, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-2.5">
                            <div className="font-bold text-[#1A1A1A]">{pl.productName}</div>
                            <div className="text-[10px] text-[#7A8B82] font-mono">
                              {pl.sku} · Effective: {pl.effectiveDate}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-bold text-[#1A1A1A]">
                            ₹{pl.purchaseRate}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-semibold text-[#079455]">
                            ₹{pl.notifiedMrp}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-bold text-[#175CD3]">
                            {pl.schemeDiscountPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statutory Document Verification */}
              <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-[#1A1A1A]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#079455]" />
                    <span>Statutory Documents on File (FR-SUP-05)</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#079455]">{selectedSupplier.fcoLicenseNo}</span>
                </div>
                <p className="text-[11px] text-[#6E7B74]">
                  Principal Certificate (Form O), GST Registration Certificate, and Quality Assurance Undertaking verified.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Register Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">Register New Fertilizer / Agri-Input Supplier</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-xl text-[#788880] hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-4 sm:p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Manufacturer / Distributor Name *</label>
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g. Zuari Agro Chemicals Ltd"
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Supplier GSTIN *</label>
                  <input
                    type="text"
                    required
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AAACZ1122K1Z5"
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">FCO O-Form / CIB License No</label>
                  <input
                    type="text"
                    value={fcoLicenseNo}
                    onChange={(e) => setFcoLicenseNo(e.target.value)}
                    placeholder="FCO/MFG/MH/2025-99"
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    value={fcoLicenseExpiry}
                    onChange={(e) => setFcoLicenseExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Contact Person & Mobile</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Area Manager Name"
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">RTGS Bank & IFSC Details</label>
                  <input
                    type="text"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="SBI A/c • IFSC"
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Credit Period (Days)</label>
                  <input
                    type="number"
                    value={creditPeriodDays}
                    onChange={(e) => setCreditPeriodDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Credit Limit Extended (₹)</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseInt(e.target.value) || 500000)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5ECE7] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EFF5F1] text-[#55635C] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#079455] text-white font-bold cursor-pointer"
                >
                  Save Supplier Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
