import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  RefreshCw,
  ArrowLeftRight,
  CheckCircle2,
  Warehouse,
} from 'lucide-react';
import { InventoryItem, Batch } from '../types';

export const InventoryIntelligence: React.FC = () => {
  const {
    inventory = [],
    godowns = [],
    stockTransfers = [],
    createStockTransfer,
    receiveStockTransfer,
    setActiveModal,
  } = useApp();

  const safeInventory = inventory || [];
  const [filterTab, setFilterTab] = useState<'expiring' | 'low_stock' | 'godowns_transfers' | 'fast_moving' | 'slow_moving'>('expiring');
  const [leadTimeDays, setLeadTimeDays] = useState<number>(60); // Configurable 60/30/15 days (FR-INV-03)

  // Stock Transfer Form State (FR-INV-04)
  const [fromGodownId, setFromGodownId] = useState(godowns[0]?.id || 'godown-apmc-1');
  const [toGodownId, setToGodownId] = useState(godowns[1]?.id || 'godown-pimpalgaon-2');
  const [selectedProductId, setSelectedProductId] = useState(safeInventory[0]?.id || 'inv-001');
  const [transferQty, setTransferQty] = useState<number>(40);
  const [vehicleNo, setVehicleNo] = useState('MH-15-CQ-9012');

  const allBatches: { item: InventoryItem; batch: Batch }[] = [];
  safeInventory.forEach((item) => {
    (item.batches || []).forEach((b) => {
      allBatches.push({ item, batch: b });
    });
  });

  // Sort batches by FEFO (First Expiry First Out)
  allBatches.sort((a, b) => (a.batch?.daysRemaining || 0) - (b.batch?.daysRemaining || 0));

  const expiringWithinLeadTime = allBatches.filter((b) => b.batch.daysRemaining <= leadTimeDays);
  const lowStockItems = safeInventory.filter((i) => i.stockQty <= i.reorderLevel);

  const filteredItems = safeInventory.filter((item) => {
    if (filterTab === 'low_stock') return item.stockQty <= item.reorderLevel;
    if (filterTab === 'fast_moving') return item.velocity === 'fast';
    if (filterTab === 'slow_moving') return item.velocity === 'slow';
    return true;
  });

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromGodownId === toGodownId) return;
    const fromGdn = godowns.find((g) => g.id === fromGodownId);
    const toGdn = godowns.find((g) => g.id === toGodownId);
    const prod = safeInventory.find((i) => i.id === selectedProductId) || safeInventory[0];
    if (!fromGdn || !toGdn || !prod) return;

    createStockTransfer({
      fromGodownId,
      fromGodownName: fromGdn.name,
      toGodownId,
      toGodownName: toGdn.name,
      productName: prod.name,
      batchNumber: prod.batches?.[0]?.batchNumber || 'LOT-01',
      quantity: transferQty,
      unit: prod.unit,
      vehicleNo,
    });
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow space-y-4">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                Multi-Godown Inventory, FEFO Batch Radar & Stock Transfers (PRD Section 6.3)
              </h3>
              <p className="text-[11px] text-[#6E7B74]">
                Configurable 60/30/15-day expiry lead time • Expired batch billing lock • Inter-godown STN transfers
              </p>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#EFF5F1] p-1 rounded-2xl">
          <button
            onClick={() => setFilterTab('expiring')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'expiring' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#F9AD19]" />
            <span>FEFO Expiry Radar ({expiringWithinLeadTime.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'low_stock' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#B54708]" />
            <span>Low Stock ({lowStockItems.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('godowns_transfers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'godowns_transfers' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#079455]" />
            <span>Godowns & Stock Transfer ({stockTransfers.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('fast_moving')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'fast_moving' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#079455]" />
            <span>Fast Movers</span>
          </button>

          <button
            onClick={() => setFilterTab('slow_moving')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'slow_moving' ? 'bg-[#1A1A1A] text-white shadow-2xs' : 'text-[#607067] hover:text-[#1A1A1A]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-[#98A2B3]" />
            <span>Slow Stock</span>
          </button>
        </div>
      </div>

      {/* Configurable Expiry Lead-Time Selector (FR-INV-03) */}
      {filterTab === 'expiring' && (
        <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-[#54645B]">
            <strong className="text-[#1A1A1A]">Configurable Expiry Alert Lead-Time (FR-INV-03):</strong> Highlighting batches expiring within{' '}
            <strong className="text-[#D92D20]">{leadTimeDays} days</strong>. Expired batches are locked from counter billing by default (FR-INV-08).
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#6E7B74]">Lead Time:</span>
            {[15, 30, 60, 180].map((d) => (
              <button
                key={d}
                onClick={() => setLeadTimeDays(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  leadTimeDays === d ? 'bg-[#079455] text-white' : 'bg-white border border-[#DCE4DF] text-[#54645B]'
                }`}
              >
                {d === 180 ? 'All Batches' : `≤ ${d} Days`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: FEFO EXPIRY RADAR */}
      {filterTab === 'expiring' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                <th className="py-2.5 px-3">Product Name & Classification</th>
                <th className="py-2.5 px-3">Batch / Lot No</th>
                <th className="py-2.5 px-3">Godown & Rack</th>
                <th className="py-2.5 px-3 text-right">Stock Qty</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-3">FEFO Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5F2]">
              {allBatches
                .filter(({ batch }) => leadTimeDays === 180 || batch.daysRemaining <= leadTimeDays)
                .map(({ item, batch }, idx) => {
                  const isExpired = batch.status === 'expired' || batch.daysRemaining <= 0;
                  const isCritical = !isExpired && batch.daysRemaining <= 30;
                  const isWarning = batch.daysRemaining > 30 && batch.daysRemaining <= 60;

                  return (
                    <tr key={idx} className="hover:bg-[#F9FBF9] transition-colors group">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1A1A1A] group-hover:text-[#079455] transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[#7A8B82] mt-0.5">
                          {item.category} · SKU: {item.sku}
                          {item.isSubsidised ? ' · DBT Subsidised (PoS Required)' : ''}
                          {item.notifiedMrp ? ` · Ceiling MRP: ₹${item.notifiedMrp}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-[#1A1A1A]">
                        {batch.batchNumber}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-semibold text-[#54625A]">
                          <MapPin className="w-3 h-3 text-[#7A8B82]" />
                          <span>{batch.rack}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-[#1A1A1A]">
                        {batch.quantity} {item.unit}
                      </td>

                      <td className="py-3 px-3 font-medium text-[#404D46]">
                        {batch.expiryDate}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`font-bold text-xs ${
                            isExpired
                              ? 'text-[#D92D20]'
                              : isCritical
                              ? 'text-[#D92D20]'
                              : isWarning
                              ? 'text-[#B54708]'
                              : 'text-[#079455]'
                          }`}
                        >
                          {isExpired
                            ? `EXPIRED (${Math.abs(batch.daysRemaining)}d ago) · Blocked`
                            : `${batch.daysRemaining} days remaining`}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isExpired ? (
                            <button
                              onClick={() => setActiveModal('new_sale')}
                              className="px-2.5 py-1 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              Bill FEFO First
                            </button>
                          ) : (
                            <button
                              onClick={() => setActiveModal('stock_adjust')}
                              className="px-2.5 py-1 rounded-xl bg-[#D92D20] hover:bg-[#B42318] text-white text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Write-off / RTV
                            </button>
                          )}
                          <button
                            onClick={() => setActiveModal('stock_adjust')}
                            className="p-1.5 rounded-xl bg-[#EFF5F1] hover:bg-[#D0E2D7] text-[#6E7B74] hover:text-[#1A1A1A] cursor-pointer"
                            title="Cycle Count Reconciliation"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: MULTI-GODOWN & INTER-GODOWN STOCK TRANSFERS (FR-INV-01 & FR-INV-04) */}
      {filterTab === 'godowns_transfers' && (
        <div className="space-y-4">
          {/* Godown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 tabular-nums">
            {godowns.map((g) => {
              const utilPct = Math.min(100, Math.round((g.occupiedBags / g.capacityBags) * 100));
              return (
                <div key={g.id} className="p-4 rounded-2xl bg-[#F9FBFA] border border-[#E5ECE7] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#079455]">{g.code}</span>
                      <span className="text-[#6E7B74] font-semibold">Mgr: {g.managerName}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#1A1A1A] mt-1 flex items-center gap-1.5">
                      <Warehouse className="w-4 h-4 text-[#079455]" />
                      <span>{g.name}</span>
                    </h4>
                    <p className="text-[11px] text-[#6E7B74] mt-0.5">{g.location}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#E5ECE7] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6E7B74]">Live Stock Value (FR-INV-07):</span>
                      <strong className="text-[#1A1A1A]">₹{g.stockValue.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E7B74]">Capacity Utilization:</span>
                      <strong className="text-[#079455]">{g.occupiedBags} / {g.capacityBags} Bags ({utilPct}%)</strong>
                    </div>
                    <div className="w-full h-1.5 bg-[#E0EAE4] rounded-full overflow-hidden">
                      <div className="h-full bg-[#079455]" style={{ width: `${utilPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create Inter-Godown Stock Transfer Form */}
          <form
            onSubmit={handleCreateTransfer}
            className="p-4 rounded-2xl bg-[#F4FAF6] border border-[#D3E5D9] grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end text-xs"
          >
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Source Godown</label>
              <select
                value={fromGodownId}
                onChange={(e) => setFromGodownId(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold"
              >
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Destination Godown</label>
              <select
                value={toGodownId}
                onChange={(e) => setToGodownId(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold"
              >
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-[#1A1A1A] mb-1">Product & Batch to Transfer</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold"
              >
                {safeInventory.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} (Lot: {inv.batches?.[0]?.batchNumber || 'LOT-1'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Qty & Vehicle</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-2 bg-white border border-[#DCE4DF] rounded-xl font-bold text-center tabular-nums"
                />
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="Vehicle No"
                  className="flex-1 px-2 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white font-bold rounded-xl shadow-2xs cursor-pointer whitespace-nowrap"
            >
              + Dispatch STN
            </button>
          </form>

          {/* Stock Transfers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead>
                <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                  <th className="py-2.5 px-3">STN Number</th>
                  <th className="py-2.5 px-3">Product & Batch</th>
                  <th className="py-2.5 px-3">From → To Godown</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receiving Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F5F2]">
                {stockTransfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-[#F9FBF9]">
                    <td className="py-3 px-3 font-mono font-bold text-[#1A1A1A]">{trf.transferNo}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#1A1A1A]">{trf.productName}</div>
                      <div className="text-[11px] text-[#7A8B82] font-mono">Batch: {trf.batchNumber}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#54645B]">
                      {trf.fromGodownName.split('—')[0]} → <strong className="text-[#1A1A1A]">{trf.toGodownName.split('—')[0]}</strong>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#1A1A1A]">
                      {trf.quantity} {trf.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#54645B]">{trf.vehicleNo || 'MH-15-TR-1001'}</td>
                    <td className="py-3 px-3">
                      {trf.status === 'in_transit' ? (
                        <span className="font-bold text-[#B54708]">In-Transit</span>
                      ) : (
                        <span className="font-bold text-[#079455] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Received</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {trf.status === 'in_transit' ? (
                        <button
                          onClick={() => receiveStockTransfer(trf.id)}
                          className="px-3 py-1 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white font-bold text-[11px] cursor-pointer"
                        >
                          Confirm Receipt
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#7A8B82]">Reconciled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOW STOCK / FAST / SLOW MOVERS */}
      {filterTab !== 'expiring' && filterTab !== 'godowns_transfers' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                <th className="py-2.5 px-3">Item & Category</th>
                <th className="py-2.5 px-3 text-right">Current Stock</th>
                <th className="py-2.5 px-3 text-right">Reorder Threshold</th>
                <th className="py-2.5 px-3 text-right">Unit MRP</th>
                <th className="py-2.5 px-3">Velocity</th>
                <th className="py-2.5 px-3">Supplier Partner</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5F2]">
              {filteredItems.map((item) => {
                const isBelowReorder = item.stockQty <= item.reorderLevel;
                return (
                  <tr key={item.id} className="hover:bg-[#F9FBF9] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#1A1A1A]">{item.name}</div>
                      <div className="text-[10px] text-[#7A8B82]">{item.sku} · {item.rackLocation}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-extrabold text-sm ${isBelowReorder ? 'text-[#D92D20]' : 'text-[#1A1A1A]'}`}>
                        {item.stockQty} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#54625A]">
                      {item.reorderLevel} {item.unit} (Suggest: +{item.suggestedReorderQty})
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#1A1A1A]">
                      ₹{item.unitPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 font-bold uppercase text-[11px] text-[#079455]">
                      {item.velocity}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#404D46] truncate max-w-[180px]">
                      {item.supplierName}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setActiveModal('create_po')}
                        className="px-3 py-1 rounded-xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        + Create PO
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
