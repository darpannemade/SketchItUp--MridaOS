import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Smartphone,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Boxes,
  IndianRupee,
  Wifi,
  Send,
  Sparkles,
} from 'lucide-react';

export const MobileCompanionView: React.FC = () => {
  const {
    inventory = [],
    purchaseOrders = [],
    deliveries = [],
    khata = [],
    approvePurchaseOrder,
    confirmDeliveryPoD,
    recordKhataPayment,
    showToast,
  } = useApp();

  const [activePersona, setActivePersona] = useState<'owner' | 'godown' | 'field'>('owner');
  const [scannedBatch, setScannedBatch] = useState<string>('IFFCO-UREA-2026-B14');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(khata[0]?.id || '');
  const [collectionAmount, setCollectionAmount] = useState<string>('2500');

  const pendingApprovals = purchaseOrders.filter((po) => po.status === 'pending_owner_approval');
  const activeDispatches = deliveries.filter(
    (d) => d.status === 'dispatched' || d.status === 'pending'
  );
  const totalReceivables = khata.reduce((s, k) => s + (k.outstandingBalance || 0), 0);

  const handleSimulateScan = (batchCode: string) => {
    setScannedBatch(batchCode);
    showToast(`Barcode Scanned: ${batchCode} — FEFO Priority Verified`, 'success');
  };

  const handleFieldCollect = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(collectionAmount);
    if (!selectedFarmerId || !amt || amt <= 0) return;
    recordKhataPayment(selectedFarmerId, amt);
    setCollectionAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              PRD §7 • Mobile Companion Apps (Android & iOS)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 flex items-center gap-1">
              <Wifi className="w-3 h-3" /> Offline-First SQLite Sync Ready
            </span>
          </div>
          <h2 className="text-xl font-extrabold font-headline text-on-surface mt-1.5 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            MridaOS Mobile Companion Suite — Role-Based Field & Godown Apps
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Interactive simulator for the 3 role-specific mobile companion experiences: Owner P&L & Approvals, Godown Barcode Scanner, and Field Sales/Delivery PoD
          </p>
        </div>

        {/* Persona Switcher */}
        <div className="flex items-center bg-surface-container p-1 rounded-xl border border-outline-variant/20">
          <button
            onClick={() => setActivePersona('owner')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePersona === 'owner'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            1. Owner Dashboard App
          </button>
          <button
            onClick={() => setActivePersona('godown')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePersona === 'godown'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            2. Godown Keeper Scanner
          </button>
          <button
            onClick={() => setActivePersona('field')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePersona === 'field'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            3. Field & Delivery PoD
          </button>
        </div>
      </div>

      {/* Main Mobile Simulator + Spec Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Phone Viewport */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[380px] bg-zinc-900 rounded-[36px] p-3 shadow-xl border-4 border-zinc-800">
            <div className="bg-surface rounded-[26px] overflow-hidden min-h-[600px] flex flex-col justify-between">
              {/* Mobile Status Bar */}
              <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold block">
                    MridaOS Mobile • 4G Sync
                  </span>
                  <h4 className="text-sm font-extrabold font-headline">
                    {activePersona === 'owner'
                      ? 'Owner Command Pocket'
                      : activePersona === 'godown'
                      ? 'Godown FEFO Scanner'
                      : 'Field Khata & PoD App'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-mono">
                  ONLINE
                </span>
              </div>

              {/* Mobile Body Content */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {activePersona === 'owner' && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-emerald-800">
                          Today Margin
                        </span>
                        <div className="text-lg font-black font-mono text-emerald-950 mt-0.5">
                          18.4%
                        </div>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-amber-900">
                          Khata Dues
                        </span>
                        <div className="text-lg font-black font-mono text-amber-950 mt-0.5">
                          ₹{(totalReceivables / 1000).toFixed(1)}k
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface">
                          PO Approvals (&gt;₹1 Lakh)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {pendingApprovals.length} Pending
                        </span>
                      </div>
                      {pendingApprovals.length === 0 ? (
                        <p className="text-xs text-on-surface-variant py-2">
                          All high-value Purchase Orders approved!
                        </p>
                      ) : (
                        pendingApprovals.map((po) => (
                          <div
                            key={po.id}
                            className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-bold text-on-surface">
                                {po.supplierName || 'Fertilizer Supplier'}
                              </div>
                              <div className="text-[11px] font-mono text-on-surface-variant">
                                {po.id} • ₹{po.totalAmount.toLocaleString('en-IN')}
                              </div>
                            </div>
                            <button
                              onClick={() => approvePurchaseOrder(po.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> FCO License Monitor
                      </span>
                      <p className="text-xs font-semibold text-indigo-950 mt-1">
                        State Wholesale License & Retail Form A2 active. Zero expired batches sold this month.
                      </p>
                    </div>
                  </>
                )}

                {activePersona === 'godown' && (
                  <>
                    <div className="bg-zinc-950 text-white p-4 rounded-xl text-center space-y-2 relative overflow-hidden">
                      <QrCode className="w-12 h-12 mx-auto text-emerald-400" />
                      <div className="text-xs font-bold">Camera Barcode / QR Scanner</div>
                      <div className="text-[11px] font-mono text-emerald-300 bg-white/10 py-1 px-2 rounded">
                        {scannedBatch}
                      </div>
                      <div className="flex justify-center gap-1.5 pt-1">
                        {inventory.slice(0, 2).map((item) => {
                          const batchCode = item.batches?.[0]?.batchNumber || (item as any).batch || 'BCH-01';
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleSimulateScan(batchCode)}
                              className="px-2 py-1 rounded bg-emerald-600/30 border border-emerald-400/40 text-[10px] font-mono text-emerald-200 cursor-pointer"
                            >
                              Scan {batchCode}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-on-surface block">
                        FEFO Pick Priority Queue
                      </span>
                      {inventory.slice(0, 4).map((item) => {
                        const batch = item.batches?.[0];
                        const batchCode = batch?.batchNumber || (item as any).batch || 'BCH-2026';
                        const daysLeft = batch?.daysRemaining ?? (item as any).daysToExpiry ?? 90;
                        const location = (batch as any)?.godownLocation || batch?.rack || 'Main Godown';
                        return (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-on-surface">{item.name}</div>
                              <div className="text-[10px] font-mono text-on-surface-variant">
                                Batch: {batchCode} • {location}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                daysLeft <= 0
                                  ? 'bg-error-container text-on-error-container'
                                  : daysLeft <= 30
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {daysLeft <= 0 ? 'LOCKED' : `${daysLeft}d left`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {activePersona === 'field' && (
                  <>
                    {/* Delivery PoD Section */}
                    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-primary" /> Active Dispatches (PoD)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-primary">
                          {activeDispatches.length} Active
                        </span>
                      </div>
                      {activeDispatches.length === 0 ? (
                        <p className="text-xs text-on-surface-variant">
                          All deliveries confirmed with OTP!
                        </p>
                      ) : (
                        activeDispatches.map((d) => (
                          <div
                            key={d.id}
                            className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/15 space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-xs font-bold text-on-surface">
                                  {d.customerName}
                                </div>
                                <div className="text-[10px] text-on-surface-variant">
                                  {d.destinationVillage} • {d.vehicleNumber}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-mono font-bold">
                                OTP: {d.podReference || '9482'}
                              </span>
                            </div>
                            <button
                              onClick={() => confirmDeliveryPoD(d.id, '9482')}
                              className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verify Customer OTP & Complete PoD
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Field Khata Collection */}
                    <form
                      onSubmit={handleFieldCollect}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 space-y-2.5"
                    >
                      <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-700" /> Field Khata Collection + WhatsApp Receipt
                      </span>
                      <select
                        value={selectedFarmerId}
                        onChange={(e) => setSelectedFarmerId(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                      >
                        {khata.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name} ({k.village}) — Due ₹{k.outstandingBalance.toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={collectionAmount}
                          onChange={(e) => setCollectionAmount(e.target.value)}
                          placeholder="Amount ₹"
                          className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Collect
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>

              {/* Bottom Tab Bar */}
              <div className="bg-surface-container-low border-t border-outline-variant/15 px-6 py-2.5 flex justify-around text-[10px] font-bold text-on-surface-variant">
                <button
                  onClick={() => setActivePersona('owner')}
                  className={activePersona === 'owner' ? 'text-primary' : ''}
                >
                  Owner
                </button>
                <button
                  onClick={() => setActivePersona('godown')}
                  className={activePersona === 'godown' ? 'text-primary' : ''}
                >
                  Godown
                </button>
                <button
                  onClick={() => setActivePersona('field')}
                  className={activePersona === 'field' ? 'text-primary' : ''}
                >
                  Field PoD
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRD Section 7 Capabilities Matrix */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15">
            <h3 className="text-base font-bold font-headline text-on-surface">
              PRD Section 7 — Mobile Architecture & Offline Sync Specifications
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Designed for rural godowns and village collection routes with intermittent 2G/4G connectivity
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-on-surface">7.1 Owner Mobile App</h4>
                <ul className="text-[11px] text-on-surface-variant space-y-1">
                  <li>• Live daily sales, gross margin, and cash vs credit split</li>
                  <li>• One-tap PO approval for orders &gt; ₹1,00,000</li>
                  <li>• Credit limit override authorizations</li>
                  <li>• FCO license & subsidy variance push alerts</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-on-surface">7.2 Godown Keeper App</h4>
                <ul className="text-[11px] text-on-surface-variant space-y-1">
                  <li>• Camera barcode/QR batch scanning during GRN inward</li>
                  <li>• FEFO pick-list guidance by rack/bay location</li>
                  <li>• Cycle count & damaged/caked bag photo upload</li>
                  <li>• Works offline inside metal-roof godowns</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-800 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-on-surface">7.3 Field & Delivery App</h4>
                <ul className="text-[11px] text-on-surface-variant space-y-1">
                  <li>• Sub-dealer order booking with live godown stock</li>
                  <li>• Village Khata payment collection + WhatsApp receipt</li>
                  <li>• Electronic Proof of Delivery (OTP + e-Signature)</li>
                  <li>• Automatic Tally Receipt Voucher creation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
