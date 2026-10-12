import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DeliveryChallan } from '../../types';

export const DeliveryDispatchView: React.FC = () => {
  const { deliveries = [], sales = [], createDeliveryChallan, captureProofOfDelivery } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'dispatched' | 'delivered' | 'discrepancy'>('all');
  const [selectedChallanForPod, setSelectedChallanForPod] = useState<DeliveryChallan | null>(null);
  const [podType, setPodType] = useState<'otp' | 'signature' | 'photo'>('otp');
  const [podReference, setPodReference] = useState('OTP-9241 Confirmed by Buyer');
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  // Create Challan Modal State
  const [isNewChallanOpen, setIsNewChallanOpen] = useState(false);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState(sales[0]?.invoiceNo || 'INV/2026/00105');
  const [destinationVillage, setDestinationVillage] = useState('Niphad Mandi Road, Plot 12');
  const [vehicleNumber, setVehicleNumber] = useState('MH-15-DK-7721 (Mahindra Bolero Pickup)');
  const [driverName, setDriverName] = useState('Santosh Wagh');
  const [driverPhone, setDriverPhone] = useState('+91 97641 11223');

  const filteredDeliveries = deliveries.filter((d) =>
    statusFilter === 'all' ? true : d.status === statusFilter
  );

  const handleConfirmPod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallanForPod) return;
    captureProofOfDelivery(
      selectedChallanForPod.id,
      podType,
      podReference,
      discrepancyNote.trim() ? discrepancyNote.trim() : undefined
    );
    setSelectedChallanForPod(null);
    setDiscrepancyNote('');
  };

  const handleCreateChallan = (e: React.FormEvent) => {
    e.preventDefault();
    const saleObj = sales.find((s) => s.invoiceNo === selectedInvoiceNo) || sales[0];
    createDeliveryChallan({
      invoiceNo: selectedInvoiceNo,
      saleId: saleObj?.id || 'sale-001',
      customerName: saleObj?.customerName || 'Vitthalrao Shinde',
      customerPhone: saleObj?.customerPhone || '+91 98812 33445',
      destinationVillage,
      itemsSummary: saleObj?.items?.map((i) => `${i.qty} × ${i.name}`).join(', ') || '15 Bags Regulated Fertilizer',
      totalBagsOrUnits: saleObj?.items?.reduce((s, i) => s + i.qty, 0) || 15,
      vehicleNumber,
      driverName,
      driverPhone,
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'dispatched',
    });
    setIsNewChallanOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#175CD3] text-white flex items-center justify-center shadow-2xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
              Delivery Challans, Vehicle Assignment & Proof of Delivery (PRD Section 6.7)
            </h2>
            <p className="text-xs text-[#6E7B74]">
              FR-DEL-01 to FR-DEL-05 • Linked Sales Invoices • Vehicle & Driver Dispatch • OTP / Signature Proof of Delivery & Discrepancy Tracking
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewChallanOpen(true)}
          className="px-4 py-2 rounded-2xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Generate Delivery Challan</span>
        </button>
      </div>

      {/* Filter Bar & KPIs */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#EFF5F1] p-1 rounded-2xl">
            {(['all', 'pending', 'dispatched', 'delivered', 'discrepancy'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-[#1A1A1A] text-white' : 'text-[#54645B] hover:text-[#1A1A1A]'
                }`}
              >
                {st === 'all' ? `All Challans (${deliveries.length})` : st}
              </button>
            ))}
          </div>

          <div className="text-xs text-[#6E7B74] tabular-nums">
            Active Fleet: <strong className="text-[#1A1A1A]">2 Vehicles</strong> · Delivered Today:{' '}
            <strong className="text-[#079455]">{deliveries.filter((d) => d.status === 'delivered').length}</strong>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                <th className="py-2.5 px-3">Challan & Invoice</th>
                <th className="py-2.5 px-3">Customer & Destination</th>
                <th className="py-2.5 px-3">Items Dispatched</th>
                <th className="py-2.5 px-3">Assigned Vehicle & Driver</th>
                <th className="py-2.5 px-3">Delivery Status (FR-DEL-05)</th>
                <th className="py-2.5 px-3 text-right">Proof of Delivery (FR-DEL-03)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5F2]">
              {filteredDeliveries.map((del) => (
                <tr key={del.id} className="hover:bg-[#F9FBF9]">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-[#1A1A1A]">{del.challanNo}</div>
                    <div className="text-[11px] font-mono text-[#079455]">Inv: {del.invoiceNo}</div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-[#1A1A1A]">{del.customerName}</div>
                    <div className="text-[11px] text-[#6E7B74] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#079455]" />
                      <span>{del.destinationVillage}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium text-[#1A1A1A]">{del.itemsSummary}</div>
                    <div className="text-[11px] text-[#7A8B82]">Total Load: {del.totalBagsOrUnits} Units</div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-mono font-semibold text-[#1A1A1A]">{del.vehicleNumber}</div>
                    <div className="text-[11px] text-[#6E7B74]">
                      Driver: {del.driverName} ({del.driverPhone})
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    {del.status === 'delivered' && (
                      <span className="font-bold text-[#079455] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </span>
                    )}
                    {del.status === 'dispatched' && (
                      <span className="font-bold text-[#175CD3] flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatched · On Route</span>
                      </span>
                    )}
                    {del.status === 'pending' && (
                      <span className="font-bold text-[#B54708] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Godown Loading</span>
                      </span>
                    )}
                    {del.status === 'discrepancy' && (
                      <span className="font-bold text-[#D92D20] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Discrepancy Flagged</span>
                      </span>
                    )}
                    {del.discrepancyNote && (
                      <div className="text-[10px] text-[#D92D20] mt-0.5">{del.discrepancyNote}</div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right">
                    {del.status === 'delivered' ? (
                      <div className="text-right">
                        <div className="font-bold text-[#079455] flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{del.podReference}</span>
                        </div>
                        <div className="text-[10px] text-[#7A8B82]">{del.podTimestamp}</div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedChallanForPod(del);
                          setPodReference(`OTP-${Math.floor(1000 + Math.random() * 8999)} Verified by Farmer`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white font-bold text-xs cursor-pointer"
                      >
                        Capture PoD / Flag Issue
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof of Delivery (PoD) Modal (FR-DEL-03 & FR-DEL-04) */}
      {selectedChallanForPod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Capture Proof of Delivery (PoD)</h3>
                <p className="text-xs text-[#6E7B74]">
                  {selectedChallanForPod.challanNo} · {selectedChallanForPod.customerName}
                </p>
              </div>
              <button onClick={() => setSelectedChallanForPod(null)} className="p-1.5 rounded-xl text-[#788880] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmPod} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">PoD Verification Mode (FR-DEL-03)</label>
                <select
                  value={podType}
                  onChange={(e) => setPodType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
                >
                  <option value="otp">Customer Mobile OTP Verification</option>
                  <option value="signature">Digital Receiver Signature</option>
                  <option value="photo">Unloading Gate Photo Timestamp</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Verification Reference / OTP Code</label>
                <input
                  type="text"
                  required
                  value={podReference}
                  onChange={(e) => setPodReference(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono font-bold text-[#079455]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">
                  Delivery Discrepancy / Shortages (Optional — FR-DEL-04)
                </label>
                <input
                  type="text"
                  value={discrepancyNote}
                  onChange={(e) => setDiscrepancyNote(e.target.value)}
                  placeholder="Leave blank if 100% intact, or note damaged/short bags..."
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-[#E5ECE7] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChallanForPod(null)}
                  className="px-4 py-2 rounded-xl bg-[#EFF5F1] text-[#55635C] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#079455] text-white font-bold cursor-pointer"
                >
                  Confirm Delivery Loop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate New Delivery Challan Modal */}
      {isNewChallanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">Generate Delivery Challan (FR-DEL-01)</h3>
              <button onClick={() => setIsNewChallanOpen(false)} className="p-1.5 rounded-xl text-[#788880] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateChallan} className="p-4 sm:p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Link Confirmed Sales Invoice</label>
                <select
                  value={selectedInvoiceNo}
                  onChange={(e) => setSelectedInvoiceNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
                >
                  {sales.map((s) => (
                    <option key={s.id} value={s.invoiceNo}>
                      {s.invoiceNo} — {s.customerName} (₹{s.total.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Destination Village / Farm Gate</label>
                <input
                  type="text"
                  required
                  value={destinationVillage}
                  onChange={(e) => setDestinationVillage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Assign Vehicle (FR-DEL-02)</label>
                <select
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
                >
                  <option value="MH-15-DK-7721 (Mahindra Bolero Pickup)">MH-15-DK-7721 (Mahindra Bolero Pickup)</option>
                  <option value="MH-15-EF-4509 (Tata Ace Gold)">MH-15-EF-4509 (Tata Ace Gold)</option>
                  <option value="MH-15-GV-4410 (Ashok Leyland Dost)">MH-15-GV-4410 (Ashok Leyland Dost)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Driver Mobile</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5ECE7] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewChallanOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EFF5F1] text-[#55635C] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#079455] text-white font-bold cursor-pointer"
                >
                  Dispatch Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
