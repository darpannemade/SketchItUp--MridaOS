import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Truck,
  Plus,
  Clock,
  CheckCircle2,
  PackageCheck,
  ShieldAlert,
  FileCheck2,
  Building2,
  X,
} from 'lucide-react';
import { PurchaseOrder } from '../types';

export const ProcurementSection: React.FC = () => {
  const {
    purchaseOrders = [],
    godowns = [],
    setActiveModal,
    setActiveView,
    approvePurchaseOrder,
    recordGRNAgainstPO,
    userProfile,
  } = useApp();

  const safePOs = purchaseOrders || [];
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);
  const [batchNumber, setBatchNumber] = useState('LOT-2026-88');
  const [manufacturingDate, setManufacturingDate] = useState('2026-09-01');
  const [expiryDate, setExpiryDate] = useState('2028-08-31');
  const [receivedQty, setReceivedQty] = useState<number>(150);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('PINV/2026/9042');
  const [selectedGodownId, setSelectedGodownId] = useState(godowns[0]?.id || 'godown-apmc-1');

  const isOwnerOrAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  const openGrnModal = (po: PurchaseOrder) => {
    setSelectedPOForGRN(po);
    const defaultQty = po.lineItems?.[0]?.orderedQty || po.itemsCount * 50 || 100;
    setReceivedQty(defaultQty);
    setRejectedQty(0);
    setBatchNumber(`LOT-${po.poNumber.split('-').pop()}-${Math.floor(10 + Math.random() * 89)}`);
    setSupplierInvoiceNo(`PINV/${po.supplierName.slice(0, 4).toUpperCase()}/${Math.floor(1000 + Math.random() * 8999)}`);
  };

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForGRN || !batchNumber.trim() || !expiryDate) return;
    await recordGRNAgainstPO(selectedPOForGRN.id, {
      batchNumber,
      manufacturingDate,
      expiryDate,
      receivedQty,
      rejectedQty,
      supplierInvoiceNo,
      godownId: selectedGodownId,
    });
    setSelectedPOForGRN(null);
  };

  const getStatusLabel = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'pending_owner_approval':
        return (
          <span className="text-[11px] font-bold text-[#B54708] flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Awaiting Owner Approval (&gt;₹1L)</span>
          </span>
        );
      case 'dispatched':
        return (
          <span className="text-[11px] font-bold text-[#026AA2] flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            <span>Dispatched · In Transit</span>
          </span>
        );
      case 'grn_pending':
        return (
          <span className="text-[11px] font-bold text-[#B54708] flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>At Gate · GRN Pending</span>
          </span>
        );
      case 'pending_acknowledgement':
        return (
          <span className="text-[11px] font-bold text-[#6E4F18] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Supplier Ack Pending</span>
          </span>
        );
      case 'received':
        return (
          <span className="text-[11px] font-bold text-[#079455] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>GRN Inwarded & Synced to Tally</span>
          </span>
        );
      default:
        return <span className="text-[11px] font-bold text-[#55635C]">Draft</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                Purchase Orders, Owner Approval Workflow & GRN Inwarding (PRD Section 6.2)
              </h3>
              <p className="text-[11px] text-[#6E7B74]">
                Mandatory batch/expiry capture at GRN • Variance logging • Automatic Tally Purchase Voucher generation
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveView('suppliers_master')}
            className="px-3.5 py-1.5 rounded-2xl bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Supplier Master & Price Lists</span>
          </button>
          <button
            onClick={() => setActiveModal('create_po')}
            className="px-3.5 py-1.5 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Grid of Purchase Orders */}
      {safePOs.length === 0 ? (
        <div className="py-12 px-4 text-center bg-[#F9FBF9] rounded-2xl border border-dashed border-[#CCD8D0]">
          <Truck className="w-8 h-8 text-[#8C9C93] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-[#1A1A1A]">No Purchase Orders Issued Yet</p>
          <p className="text-xs text-[#6E7B74] mt-1 max-w-sm mx-auto">
            Click "+ Create Purchase Order" above to issue an inward order to fertilizer and seed distributors.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {safePOs.map((po) => (
            <div
              key={po.id}
              className="p-4 bg-[#F9FBF9] hover:bg-white rounded-2xl border border-[#E5ECE7] hover:border-[#079455] transition-all flex flex-col justify-between group tabular-nums"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs text-[#1A1A1A]">
                    {po.poNumber} · {po.orderDate}
                  </span>
                  {getStatusLabel(po.status)}
                </div>

                <h4 className="font-bold text-sm text-[#1A1A1A] group-hover:text-[#079455] transition-colors">
                  {po.supplierName}
                </h4>

                <div className="mt-2.5 p-3 bg-white rounded-xl border border-[#EBEFEA] text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[#68776F]">
                    <span>Total Order Value:</span>
                    <strong className="text-[#1A1A1A] font-extrabold text-sm">
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[#68776F]">
                    <span>Line Items & Terms:</span>
                    <span className="font-semibold text-[#1A1A1A]">
                      {po.itemsCount} SKUs · {po.paymentTerms}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#68776F]">
                    <span>Expected Arrival:</span>
                    <span className="font-semibold text-[#079455]">{po.expectedDelivery}</span>
                  </div>
                  {po.notes && (
                    <div className="pt-1 border-t border-[#F0F5F2] text-[11px] text-[#54645B]">
                      {po.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#EBEFEA] flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#7A8B82]">
                  {po.totalAmount >= 100000 ? 'High-Value PO (>₹1L Rule)' : 'Standard Rate Contract'}
                </span>

                <div className="flex items-center gap-2">
                  {po.status === 'pending_owner_approval' && isOwnerOrAdmin && (
                    <button
                      onClick={() => approvePurchaseOrder(po.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#F9AD19] hover:bg-[#E0980B] text-[#1A1A1A] text-xs font-bold transition-colors cursor-pointer"
                    >
                      Approve PO (Owner Sign-off)
                    </button>
                  )}

                  {po.status !== 'received' && po.status !== 'pending_owner_approval' && (
                    <button
                      onClick={() => openGrnModal(po)}
                      className="px-3 py-1.5 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Receive Goods (Record GRN)</span>
                    </button>
                  )}

                  {po.status === 'received' && (
                    <span className="text-[11px] font-mono font-bold text-[#079455]">
                      GRN & Tally Voucher Booked
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GRN Capture & Purchase Invoice Booking Modal (FR-PUR-03, FR-PUR-04, FR-PUR-06) */}
      {selectedPOForGRN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">
                  Record Goods Receipt Note (GRN) & Book Purchase Invoice
                </h3>
                <p className="text-xs text-[#6E7B74]">
                  Against {selectedPOForGRN.poNumber} • {selectedPOForGRN.supplierName}
                </p>
              </div>
              <button
                onClick={() => setSelectedPOForGRN(null)}
                className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGRN} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-[#EFF8FF] rounded-2xl border border-[#B2DDFF] text-[11px] text-[#175CD3] font-medium">
                <strong>PRD Business Rule (Section 6.2):</strong> Batch/Lot number and expiry date are mandatory at GRN for shelf-life traceability. Booking this GRN updates Godown stock and queues a Purchase Voucher for Tally Prime.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Receiving Godown Location</label>
                  <select
                    value={selectedGodownId}
                    onChange={(e) => setSelectedGodownId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Supplier Invoice No (for Tally)</label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Batch / Lot Number *</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Manufacturing Date *</label>
                  <input
                    type="date"
                    required
                    value={manufacturingDate}
                    onChange={(e) => setManufacturingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Expiry Date (FEFO) *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold text-[#079455]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Accepted / Good Qty Received</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Damaged / Short Variance Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold text-[#D92D20]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5ECE7] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPOForGRN(null)}
                  className="px-4 py-2 rounded-xl bg-[#EFF5F1] text-[#55635C] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white font-bold shadow-xs cursor-pointer"
                >
                  Confirm GRN, Update Stock & Push to Tally
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
