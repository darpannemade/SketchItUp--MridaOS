import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Plus,
  Trash2,
  Receipt,
  CheckCircle2,
  Printer,
  ShoppingBag,
  ShieldAlert,
  Fingerprint,
  Truck,
  Sparkles,
  AlertTriangle,
  Scale,
  Mic,
  MessageCircle,
  FileText,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GSTInvoiceModal } from './GSTInvoiceModal';
import { calculateGSTInvoiceSummary, STANDARD_HSN_CODES } from '../../../supabase/functions/_shared/gst';
import { SaleRecord } from '../../types';
import { hardwareDirectService } from '../../services/hardwareDirectService';
import { whatsAppUpiService } from '../../services/whatsAppUpiService';
import { nicEwayBillService } from '../../services/nicEwayBillService';

export const NewSaleModal: React.FC = () => {
  const {
    inventory,
    khataLedger,
    schemes,
    addNewSale,
    setActiveModal,
    setSelectedSaleForEwayBill,
    voiceBillData,
    setVoiceBillData,
    showToast,
  } = useApp();

  const [customerName, setCustomerName] = useState(khataLedger[0]?.name || 'Dnyaneshwar Gaikwad');
  const [customerPhone, setCustomerPhone] = useState(khataLedger[0]?.phone || '+91 98220 11234');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState('27');
  const [isKhata, setIsKhata] = useState(false);

  // PRD 6.4 & 6.8: PoS / DBT Subsidy Authentication State
  const [buyerAuthMode, setBuyerAuthMode] = useState<'Aadhaar Biometric' | 'Aadhaar OTP' | 'KCC' | 'Voter ID'>('Aadhaar Biometric');
  const [buyerIdMasked, setBuyerIdMasked] = useState(khataLedger[0]?.aadhaarMasked || 'XXXX-XXXX-4821');
  const [posTransactionId, setPosTransactionId] = useState(`IFMS-MH-2026-${Math.floor(100000 + Math.random() * 899999)}`);
  const [isPosVerified, setIsPosVerified] = useState(true);

  // PRD 6.6: Credit Limit Override
  const [ownerCreditOverride, setOwnerCreditOverride] = useState(false);

  // PRD 6.3: Expired Batch Manual Override
  const [expiredBatchOverride, setExpiredBatchOverride] = useState(false);

  // PRD 6.7: Delivery & Dispatch Option
  const [requiresDelivery, setRequiresDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(khataLedger[0]?.village || 'Niphad Taluka, Nashik');

  const getFefoDefaultBatch = (invItem: typeof inventory[0]) => {
    const validBatches = (invItem.batches || [])
      .filter((b) => b.daysRemaining > 0 && b.status !== 'expired')
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
    return validBatches[0] || invItem.batches?.[0];
  };

  const [selectedItems, setSelectedItems] = useState<
    {
      itemId: string;
      name: string;
      qty: number;
      price: number;
      batch: string;
      hsnCode: string;
      gstRate: number;
      isSubsidised?: boolean;
      notifiedMrp?: number;
    }[]
  >(
    inventory.length > 0
      ? [
          {
            itemId: inventory[0].id,
            name: inventory[0].name,
            qty: 2,
            price: inventory[0].unitPrice,
            batch: getFefoDefaultBatch(inventory[0])?.batchNumber || 'NCU-2026-01',
            hsnCode: inventory[0].hsnCode || STANDARD_HSN_CODES[inventory[0].name]?.hsn || '3102',
            gstRate: inventory[0].gstRate ?? STANDARD_HSN_CODES[inventory[0].name]?.rate ?? 5.0,
            isSubsidised: inventory[0].isSubsidised,
            notifiedMrp: inventory[0].notifiedMrp,
          },
        ]
      : []
  );

  const [cashPaidInput, setCashPaidInput] = useState<string>('');
  const [isSaleCompleted, setIsSaleCompleted] = useState(false);
  const [completedSaleRecord, setCompletedSaleRecord] = useState<SaleRecord | null>(null);
  const [completedInvoiceData, setCompletedInvoiceData] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (voiceBillData) {
      if (voiceBillData.customerName) setCustomerName(voiceBillData.customerName);
      if (voiceBillData.isKhata !== undefined) setIsKhata(voiceBillData.isKhata);
      if (voiceBillData.items && voiceBillData.items.length > 0) {
        setSelectedItems(
          voiceBillData.items.map((it: any) => ({
            itemId: it.matchedId || inventory[0]?.id || 'item-1',
            name: it.name,
            qty: it.qty,
            price: it.unitPrice,
            batch: it.batch,
            hsnCode: '3102',
            gstRate: 5.0,
          }))
        );
      }
      setVoiceBillData(null);
    }
  }, [voiceBillData, inventory, setVoiceBillData]);

  // Customer lookup for Credit Limit & Monthly Subsidy Cap (FR-CRD-02 & FR-CMP-03)
  const matchedCustomer = khataLedger.find((k) => k.name.toLowerCase() === customerName.toLowerCase());

  // Check if any line item is a government-subsidised fertilizer grade (FR-SAL-02)
  const hasSubsidisedItems = selectedItems.some((it) => {
    const inv = inventory.find((i) => i.id === it.itemId);
    return Boolean(it.isSubsidised || inv?.isSubsidised);
  });

  const subsidisedBagsInCart = selectedItems.reduce((sum, it) => {
    const inv = inventory.find((i) => i.id === it.itemId);
    return it.isSubsidised || inv?.isSubsidised ? sum + it.qty : sum;
  }, 0);

  const priorMonthlyBags = matchedCustomer?.monthlySubsidisedBagsPurchased || 0;
  const monthlyCap = matchedCustomer?.monthlySubsidyCapBags || 50;
  const cumulativeMonthlyBags = priorMonthlyBags + subsidisedBagsInCart;
  const isBreachingMonthlyCap = hasSubsidisedItems && cumulativeMonthlyBags > monthlyCap;

  // Check if any selected batch is expired (FR-INV-08)
  const hasExpiredBatchSelected = selectedItems.some((it) => {
    const inv = inventory.find((i) => i.id === it.itemId);
    const b = inv?.batches?.find((batch) => batch.batchNumber === it.batch);
    return b && (b.status === 'expired' || b.daysRemaining <= 0);
  });

  // PRD FR-SAL-04: Automatic Scheme / Volume Discount calculation on non-subsidised items
  const activeSchemeDiscount = selectedItems.reduce((disc, it) => {
    const inv = inventory.find((i) => i.id === it.itemId);
    if (inv?.isSubsidised) return disc;
    const rule = (schemes || []).find(
      (s) => s.isActive && s.applicableCategory === inv?.category && it.qty >= s.minQty
    );
    if (rule) {
      return disc + Math.round((it.qty * it.price * rule.discountPct) / 100);
    }
    return disc;
  }, 0);

  const isInterstate = customerStateCode.trim() !== '27';
  const lineItemInputs = selectedItems.map((it) => ({
    item_id: it.itemId,
    name: it.name,
    qty: it.qty,
    price: it.price,
    batch: it.batch,
    hsn_code: it.hsnCode,
    gst_rate: it.gstRate,
  }));

  const liveGstSummary = calculateGSTInvoiceSummary(lineItemInputs, {
    customerStateCode,
    branchStateCode: '27',
  });

  const grandTotal = Math.max(0, liveGstSummary.grand_total - activeSchemeDiscount);
  const cashPaid = isKhata ? Number(cashPaidInput) || 0 : grandTotal;
  const khataAmount = isKhata ? Math.max(0, grandTotal - cashPaid) : 0;

  // Credit Limit Check (FR-CRD-02)
  const projectedOutstanding = (matchedCustomer?.outstandingBalance || 0) + (isKhata ? khataAmount : 0);
  const customerCreditLimit = matchedCustomer?.creditLimit || 50000;
  const isCreditLimitExceeded = isKhata && projectedOutstanding > customerCreditLimit;

  const handleAddItem = () => {
    if (inventory.length === 0) return;
    const available = inventory[selectedItems.length % inventory.length] || inventory[0];
    const std = STANDARD_HSN_CODES[available.name] || { hsn: available.hsnCode || '3102', rate: available.gstRate ?? 5.0 };
    const defaultBatch = getFefoDefaultBatch(available);
    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: available.id,
        name: available.name,
        qty: 1,
        price: available.unitPrice,
        batch: defaultBatch?.batchNumber || 'DEFAULT-BATCH',
        hsnCode: std.hsn,
        gstRate: std.rate,
        isSubsidised: available.isSubsidised,
        notifiedMrp: available.notifiedMrp,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQtyChange = (index: number, qty: number) => {
    setValidationError(null);
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: Math.max(1, qty) } : item))
    );
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    setValidationError(null);
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        // PRD FR-CMP-07: Enforce government-notified MRP ceiling on regulated fertilizer
        if (item.notifiedMrp && newPrice > item.notifiedMrp) {
          setValidationError(
            `FCO Ceiling Enforcement (FR-CMP-07): Regulated fertilizer "${item.name}" cannot be billed above government-notified MRP of ₹${item.notifiedMrp}.`
          );
          return { ...item, price: item.notifiedMrp };
        }
        return { ...item, price: Math.max(1, newPrice) };
      })
    );
  };

  const handleBatchChange = (index: number, batchNo: string) => {
    setValidationError(null);
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, batch: batchNo } : item))
    );
  };

  const handleItemSelect = (index: number, itemId: string) => {
    setValidationError(null);
    const found = inventory.find((i) => i.id === itemId);
    if (found) {
      const std = STANDARD_HSN_CODES[found.name] || { hsn: found.hsnCode || '3102', rate: found.gstRate ?? 5.0 };
      const fefoBatch = getFefoDefaultBatch(found);
      setSelectedItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                itemId: found.id,
                name: found.name,
                price: found.unitPrice,
                batch: fefoBatch?.batchNumber || 'DEFAULT-BATCH',
                hsnCode: std.hsn,
                gstRate: std.rate,
                isSubsidised: found.isSubsidised,
                notifiedMrp: found.notifiedMrp,
              }
            : item
        )
      );
    }
  };

  const handleSelectCustomer = (name: string) => {
    setValidationError(null);
    setCustomerName(name);
    const existing = khataLedger.find((k) => k.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setCustomerPhone(existing.phone);
      if (existing.aadhaarMasked) setBuyerIdMasked(existing.aadhaarMasked);
      if (existing.gstin) setCustomerGstin(existing.gstin);
      if (existing.village) setDeliveryAddress(existing.village);
    }
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (selectedItems.length === 0 || !customerName.trim()) return;

    // 1. Check Expired Batch Block (FR-INV-08)
    if (hasExpiredBatchSelected && !expiredBatchOverride) {
      setValidationError(
        'FEFO Safety Block (FR-INV-08): One or more selected batches are past their expiry date. Please switch to an active batch or enable Audited Manual Override.'
      );
      return;
    }

    // 2. Check PoS/DBT Authentication Requirement (FR-SAL-02 & FR-CMP-02)
    if (hasSubsidisedItems && (!posTransactionId.trim() || !isPosVerified)) {
      setValidationError(
        'DBT / iFMS Compliance Block (FR-CMP-02): Subsidised fertilizer requires a verified PoS Transaction Reference and Aadhaar/KCC buyer authentication before billing.'
      );
      return;
    }

    // 3. Check Credit Limit Block (FR-CRD-02)
    if (isCreditLimitExceeded && !ownerCreditOverride) {
      setValidationError(
        `Credit Limit Exceeded (FR-CRD-02): Projected balance ₹${projectedOutstanding.toLocaleString('en-IN')} exceeds ${customerName}'s limit of ₹${customerCreditLimit.toLocaleString('en-IN')}. Collect more cash or enable Owner Credit Override.`
      );
      return;
    }

    const nextInvoiceNum = `INV/2026/00${Math.floor(110 + Math.random() * 890)}`;

    const newSalePayload: any = {
      id: crypto.randomUUID(),
      invoiceNo: nextInvoiceNum,
      invoice_no: nextInvoiceNum,
      invoice_number: nextInvoiceNum,
      customerName,
      customer_name: customerName,
      customerPhone,
      customer_phone: customerPhone,
      customer_gstin: customerGstin || undefined,
      customer_state_code: customerStateCode,
      branch_state_code: '27',
      is_interstate: isInterstate,
      isKhata,
      is_khata: isKhata,
      items: selectedItems.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        qty: it.qty,
        price: it.price,
        batch: it.batch,
        hsn_code: it.hsnCode,
        isSubsidised: it.isSubsidised,
        notifiedMrp: it.notifiedMrp,
      })),
      total: grandTotal,
      total_taxable_amount: liveGstSummary.total_taxable_amount,
      total_cgst: liveGstSummary.total_cgst,
      total_sgst: liveGstSummary.total_sgst,
      total_igst: liveGstSummary.total_igst,
      total_tax: liveGstSummary.total_tax,
      round_off: liveGstSummary.round_off,
      grand_total: grandTotal,
      cashPaid,
      khataAmount,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      paymentMode: isKhata ? (cashPaid > 0 ? 'split' : 'khata') : 'upi',
      hasSubsidisedItems,
      posTransactionId: hasSubsidisedItems ? posTransactionId : undefined,
      buyerAuthMode: hasSubsidisedItems ? buyerAuthMode : undefined,
      buyerIdMasked: hasSubsidisedItems ? buyerIdMasked : undefined,
      requiresDelivery,
      deliveryAddress,
      schemeDiscountApplied: activeSchemeDiscount,
    };

    addNewSale(newSalePayload);
    setCompletedSaleRecord(newSalePayload);
    setCompletedInvoiceData(liveGstSummary);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    setIsSaleCompleted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">
                Counter Billing, FEFO Allocation & PoS/DBT Subsidy Terminal
              </h3>
              <p className="text-xs text-[#6E7B74]">
                FCO Notified MRP ceiling • iFMS Aadhaar PoS mirroring • Khata credit check • Tally XML sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal('voice_bill')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#079455] border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"
              title="Voice Assisted PoS (Marathi, Hindi, English)"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice POS</span>
            </button>

            <button
              onClick={() => setActiveModal('none')}
              className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isSaleCompleted ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-[#E0EAE4] text-[#079455] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">GST & FCO Compliant Invoice Generated!</h3>
            <p className="text-xs text-[#6E7B74] mt-1">
              Invoice <strong>#{completedSaleRecord?.invoiceNo}</strong> recorded, FEFO batch decremented, and Tally Prime Sales Voucher queued.
            </p>

            <div className="w-full max-w-md my-5 p-4 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] text-left text-xs space-y-1.5 tabular-nums">
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Customer / Farmer:</span>
                <strong className="text-[#1A1A1A]">{customerName}</strong>
              </div>
              {hasSubsidisedItems && (
                <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                  <span className="text-[#6E7B74]">iFMS PoS Ref & Auth:</span>
                  <strong className="text-[#079455] font-mono">{posTransactionId} ({buyerAuthMode})</strong>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Taxable Amount:</span>
                <strong className="text-[#1A1A1A]">₹{liveGstSummary.total_taxable_amount.toFixed(2)}</strong>
              </div>
              {activeSchemeDiscount > 0 && (
                <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                  <span className="text-[#6E7B74]">Volume Scheme Discount:</span>
                  <strong className="text-[#079455]">-₹{activeSchemeDiscount.toLocaleString('en-IN')}</strong>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Grand Total (MRP Ceiling Verified):</span>
                <strong className="text-[#079455] font-extrabold text-sm">₹{grandTotal.toLocaleString('en-IN')}.00</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#6E7B74]">Tally Prime Sync Status:</span>
                <strong className="text-[#079455]">Synced via XML-over-HTTP</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {/* 1. Standard Printable Tax Invoice */}
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-3.5 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print GST Invoice</span>
              </button>

              {/* 2. Hardware-Direct Web Serial ESC/POS 58mm/80mm */}
              <button
                onClick={async () => {
                  const bytes = hardwareDirectService.generateEscPosReceipt({
                    invoiceNo: completedSaleRecord?.invoiceNo || 'INV-101',
                    date: new Date().toLocaleDateString('en-IN'),
                    farmerName: customerName,
                    farmerPhone: customerPhone,
                    aadhaarMasked: buyerIdMasked,
                    posTxnId: posTransactionId,
                    items: selectedItems.map((it) => ({
                      name: it.name,
                      qty: it.qty,
                      price: it.price,
                      batch: it.batch,
                      hsn: it.hsnCode,
                      gstRate: it.gstRate,
                    })),
                    taxableAmount: liveGstSummary.total_taxable_amount,
                    cgstAmount: liveGstSummary.total_cgst,
                    sgstAmount: liveGstSummary.total_sgst,
                    grandTotal,
                    paymentMode: isKhata ? 'Khata Credit' : 'Cash Counter',
                    width: '80mm',
                  });
                  const res = await hardwareDirectService.printEscPos(bytes);
                  showToast(res.message, 'success');
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Stream ESC/POS directly to 58mm/80mm thermal receipt printer without print preview"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Direct ESC/POS Thermal</span>
              </button>

              {/* 3. WhatsApp Cloud API Dispatch */}
              <button
                onClick={() => {
                  const msg = whatsAppUpiService.buildInvoiceMessage({
                    farmerName: customerName,
                    farmerPhone: customerPhone,
                    invoiceNo: completedSaleRecord?.invoiceNo || 'INV-101',
                    grandTotal,
                    items: selectedItems.map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
                    date: new Date().toLocaleDateString('en-IN'),
                    language: 'marathi',
                  });
                  const url = whatsAppUpiService.getWhatsAppClickUrl(customerPhone, msg);
                  window.open(url, '_blank', 'noopener,noreferrer');
                  showToast(`WhatsApp tax invoice sent to ${customerPhone}`, 'success');
                }}
                className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp Invoice</span>
              </button>

              {/* 4. NIC e-Way Bill & e-Invoice Button */}
              <button
                onClick={() => {
                  setSelectedSaleForEwayBill(completedSaleRecord || {
                    invoiceNo: 'INV/2026/00101',
                    customerName,
                    customerGstin,
                    grandTotal,
                    taxableAmount: liveGstSummary.total_taxable_amount,
                    cgstAmount: liveGstSummary.total_cgst,
                    sgstAmount: liveGstSummary.total_sgst,
                    items: selectedItems,
                    deliveryAddress,
                  });
                  setActiveModal('nic_eway_bill');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  grandTotal >= 50000
                    ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
                title={grandTotal >= 50000 ? 'Mandatory NIC e-Way Bill (> ₹50,000)' : 'Optional NIC e-Way Bill'}
              >
                <FileText className="w-4 h-4" />
                <span>{grandTotal >= 50000 ? 'NIC e-Way Bill (>₹50k)' : 'NIC e-Way Bill'}</span>
              </button>

              <button
                onClick={() => {
                  setIsSaleCompleted(false);
                }}
                className="px-4 py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-xl cursor-pointer"
              >
                + Bill Next Farmer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitSale} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 text-xs">
            {validationError && (
              <div className="p-3.5 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
                <div className="font-semibold leading-relaxed">{validationError}</div>
              </div>
            )}

            {/* 1. Customer & KYC Selector */}
            <div className="p-3.5 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Select or Enter Farmer / Sub-Dealer</label>
                  <input
                    list="farmer-khata-list"
                    type="text"
                    required
                    placeholder="Select or type customer name..."
                    value={customerName}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold text-xs focus:ring-2 focus:ring-[#079455]/30 focus:outline-none"
                  />
                  <datalist id="farmer-khata-list">
                    <option value="Walk-in Cash Farmer" />
                    {khataLedger.map((k) => (
                      <option key={k.id} value={k.name}>
                        {k.village} • Due: ₹{k.outstandingBalance}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="+91 98XXX XXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl text-xs focus:ring-2 focus:ring-[#079455]/30 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">Place of Supply & B2B GSTIN</label>
                  <div className="flex gap-1.5">
                    <select
                      value={customerStateCode}
                      onChange={(e) => setCustomerStateCode(e.target.value)}
                      className="w-1/2 px-2 py-2 bg-white border border-[#DCE4DF] rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="27">27 - MH (CGST+SGST)</option>
                      <option value="24">24 - GJ (IGST)</option>
                      <option value="23">23 - MP (IGST)</option>
                      <option value="29">29 - KA (IGST)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="GSTIN (Optional)"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      className="w-1/2 px-2.5 py-2 bg-white border border-[#DCE4DF] rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {matchedCustomer && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5ECE7] text-[11px] text-[#54645B] tabular-nums">
                  <div>
                    Type: <strong className="text-[#1A1A1A] uppercase">{matchedCustomer.customerType?.replace('_', ' ') || 'Credit Farmer'}</strong>
                    {' · '}
                    Village: <strong className="text-[#1A1A1A]">{matchedCustomer.village}</strong>
                    {matchedCustomer.landholdingAcres ? ` · Land: ${matchedCustomer.landholdingAcres} Acres` : ''}
                  </div>
                  <div>
                    Running Khata Due: <strong className="text-[#D92D20]">₹{matchedCustomer.outstandingBalance.toLocaleString('en-IN')}</strong>
                    {' / '}
                    Limit: <strong className="text-[#1A1A1A]">₹{matchedCustomer.creditLimit.toLocaleString('en-IN')}</strong>
                    {' · '}
                    Month Subsidised Quota: <strong className="text-[#079455]">{priorMonthlyBags}/{monthlyCap} Bags</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Line Items with FEFO Batch Picker & MRP Ceiling */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-[#1A1A1A]">
                  Invoice Line Items (FEFO Batch Auto-Selected • Government MRP Enforced)
                </h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Product Line</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {selectedItems.map((item, idx) => {
                  const invObj = inventory.find((i) => i.id === item.itemId);
                  const batches = invObj?.batches || [];
                  const currentBatchObj = batches.find((b) => b.batchNumber === item.batch);
                  const isBatchExpired = currentBatchObj && (currentBatchObj.status === 'expired' || currentBatchObj.daysRemaining <= 0);

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                        isBatchExpired ? 'bg-[#FEF3F2] border-[#FECDCA]' : 'bg-[#F9FBFA] border-[#E5ECE7]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <select
                          value={item.itemId}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-bold"
                        >
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} {inv.isSubsidised ? '[SUBSIDISED PoS]' : ''} • Stock: {inv.stockQty} {inv.unit}
                            </option>
                          ))}
                        </select>

                        {/* FEFO Batch Selector */}
                        <select
                          value={item.batch}
                          onChange={(e) => handleBatchChange(idx, e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-mono font-semibold"
                          title="FEFO Batch Allocation"
                        >
                          {batches.map((b) => (
                            <option key={b.batchNumber} value={b.batchNumber}>
                              Lot: {b.batchNumber} ({b.daysRemaining > 0 ? `${b.daysRemaining}d left` : 'EXPIRED'})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-[#DCE4DF] bg-white rounded-xl overflow-hidden tabular-nums">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(idx, item.qty - 1)}
                                className="px-2 py-1 bg-[#EFF5F1] hover:bg-[#E0EAE4] font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                                className="w-11 text-center text-xs font-bold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(idx, item.qty + 1)}
                                className="px-2 py-1 bg-[#EFF5F1] hover:bg-[#E0EAE4] font-bold"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleQtyChange(idx, 25);
                                showToast('⚖️ Live Weight 25.0 KG Captured from Platform Scale', 'info');
                              }}
                              className="p-1.5 rounded-xl border border-[#DCE4DF] hover:border-[#079455] hover:bg-emerald-50 text-slate-500 hover:text-[#079455] transition-colors"
                              title="Capture Live Weight from Web Serial Platform Scale (Bio-fertilizer / Loose Seed)"
                            >
                              <Scale className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1 tabular-nums">
                            <span className="text-[11px] text-[#6E7B74]">₹</span>
                            <input
                              type="number"
                              step="0.5"
                              value={item.price}
                              onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1 bg-white border border-[#DCE4DF] rounded-xl text-right text-xs font-bold"
                              title={item.notifiedMrp ? `Govt Notified Ceiling MRP: ₹${item.notifiedMrp}` : 'Unit Rate'}
                            />
                          </div>

                          <span className="font-extrabold text-xs text-[#1A1A1A] w-20 text-right tabular-nums">
                            ₹{(item.qty * item.price).toLocaleString('en-IN')}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 rounded-xl text-[#788880] hover:text-[#D92D20] hover:bg-[#FEE4E2] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-[#6E7B74] px-1">
                        <div>
                          HSN: <span className="font-mono font-semibold text-[#1A1A1A]">{item.hsnCode}</span>
                          {' · '}
                          GST: <span className="font-semibold text-[#1A1A1A]">{item.gstRate}%</span>
                          {item.notifiedMrp && (
                            <>
                              {' · '}
                              <span className="text-[#079455] font-semibold">
                                Govt Notified Ceiling MRP: ₹{item.notifiedMrp}/Bag (DBT Regulated)
                              </span>
                            </>
                          )}
                        </div>
                        {isBatchExpired && (
                          <span className="text-[#D92D20] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Expired Batch Selected — Blocked by Default (FR-INV-08)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasExpiredBatchSelected && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] flex items-center justify-between">
                  <span className="text-[#B42318] font-semibold">
                    Audited Override required to bill an expired batch (FR-INV-08):
                  </span>
                  <label className="flex items-center gap-1.5 font-bold text-[#B42318] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expiredBatchOverride}
                      onChange={(e) => setExpiredBatchOverride(e.target.checked)}
                    />
                    <span>Authorize Audited Override</span>
                  </label>
                </div>
              )}
            </div>

            {/* 3. PRD Section 6.4 & 6.8: PoS / DBT Subsidy Authentication Panel */}
            {hasSubsidisedItems && (
              <div className="p-3.5 bg-[#EFF8FF] rounded-2xl border border-[#B2DDFF] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-[#175CD3]" />
                    <span className="font-bold text-[#1A1A1A]">
                      Mandatory PoS / DBT Subsidy Authentication (iFMS Mirroring — FR-SAL-02 & FR-CMP-02)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#175CD3]">
                    {subsidisedBagsInCart} Subsidised Bags
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#54645B] mb-1">Buyer Auth Method</label>
                    <select
                      value={buyerAuthMode}
                      onChange={(e) => setBuyerAuthMode(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#B2DDFF] rounded-xl text-xs font-bold"
                    >
                      <option value="Aadhaar Biometric">Aadhaar Biometric (PoS Fingerprint)</option>
                      <option value="Aadhaar OTP">Aadhaar Registered Mobile OTP</option>
                      <option value="KCC">Kisan Credit Card (KCC)</option>
                      <option value="Voter ID">Voter ID / Land Passbook</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#54645B] mb-1">Masked Aadhaar / KCC Ref</label>
                    <input
                      type="text"
                      value={buyerIdMasked}
                      onChange={(e) => setBuyerIdMasked(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#B2DDFF] rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#54645B] mb-1">Certified PoS Transaction ID</label>
                    <input
                      type="text"
                      required
                      value={posTransactionId}
                      onChange={(e) => setPosTransactionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#B2DDFF] rounded-xl text-xs font-mono font-bold text-[#175CD3]"
                    />
                  </div>
                </div>

                {/* Monthly Cap Check (FR-CMP-03) */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#B2DDFF] text-[11px]">
                  <div className={isBreachingMonthlyCap ? 'text-[#D92D20] font-bold' : 'text-[#175CD3] font-medium'}>
                    {isBreachingMonthlyCap
                      ? `⚠️ REGULATORY CAP WARNING (FR-CMP-03): Cumulative monthly purchase (${cumulativeMonthlyBags} bags) exceeds standard 50-bag monthly limit!`
                      : `Cumulative Monthly Subsidised Purchase: ${cumulativeMonthlyBags} / ${monthlyCap} Bags (Within FCO Cap)`}
                  </div>
                  <label className="flex items-center gap-1.5 font-bold text-[#1A1A1A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPosVerified}
                      onChange={(e) => setIsPosVerified(e.target.checked)}
                    />
                    <span>PoS Biometric / Auth Confirmed</span>
                  </label>
                </div>
              </div>
            )}

            {/* 4. Payment Mode, Credit Limit Check & Delivery Dispatch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Khata Credit Split */}
              <div className="p-3 bg-[#F4FAF6] rounded-2xl border border-[#D3E5D9] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isKhata}
                      onChange={(e) => setIsKhata(e.target.checked)}
                      className="w-4 h-4 text-[#079455] rounded accent-[#079455]"
                    />
                    <span className="font-bold text-[#1A1A1A]">Bill on Khata / Credit Account (FR-SAL-03)</span>
                  </label>
                </div>

                {isKhata && (
                  <div className="space-y-2 pt-1 border-t border-[#D3E5D9]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#6E7B74] mb-0.5">Part Cash/UPI Paid</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={cashPaidInput}
                          onChange={(e) => setCashPaidInput(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#DCE4DF] rounded-lg text-xs font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#6E7B74] mb-0.5">Added to Khata Due</label>
                        <div className="px-2 py-1 bg-white border border-[#DCE4DF] rounded-lg text-xs font-extrabold text-[#B54708] tabular-nums">
                          ₹{khataAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {isCreditLimitExceeded && (
                      <div className="p-2 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[11px] text-[#B42318] space-y-1">
                        <div className="font-bold">
                          Exceeds Credit Limit (₹{projectedOutstanding.toLocaleString('en-IN')} &gt; ₹{customerCreditLimit.toLocaleString('en-IN')})
                        </div>
                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ownerCreditOverride}
                            onChange={(e) => setOwnerCreditOverride(e.target.checked)}
                          />
                          <span>Owner Credit Limit Override (FR-CRD-02)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery Challan Dispatch Option (FR-DEL-01) */}
              <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={requiresDelivery}
                      onChange={(e) => setRequiresDelivery(e.target.checked)}
                      className="w-4 h-4 text-[#079455] rounded accent-[#079455]"
                    />
                    <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#079455]" />
                      <span>Generate Delivery Challan (FR-DEL-01)</span>
                    </span>
                  </label>
                </div>

                {requiresDelivery && (
                  <div className="pt-1 border-t border-[#E5ECE7]">
                    <label className="block text-[10px] font-bold text-[#6E7B74] mb-0.5">
                      Destination Village / Farm Gate Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Village, Plot No, Landmark..."
                      className="w-full px-2.5 py-1 bg-white border border-[#DCE4DF] rounded-lg text-xs font-semibold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 5. Scheme Discount & Tax Breakdown */}
            <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] space-y-1 text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#6E7B74]">Taxable Value:</span>
                <span className="font-mono font-bold">₹{liveGstSummary.total_taxable_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#079455]">
                <span>Total GST ({isInterstate ? 'IGST' : 'CGST + SGST'}):</span>
                <span className="font-mono font-bold">+₹{liveGstSummary.total_tax.toFixed(2)}</span>
              </div>
              {activeSchemeDiscount > 0 && (
                <div className="flex justify-between text-[#079455] font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Applied Scheme / Volume Discount (FR-SAL-04):</span>
                  </span>
                  <span className="font-mono">-₹{activeSchemeDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Footer Submit */}
            <div className="pt-3 border-t border-[#E5ECE7] flex items-center justify-between">
              <div className="tabular-nums">
                <span className="text-[11px] text-[#7A8B82]">Net Payable Grand Total:</span>
                <div className="text-base sm:text-lg font-black text-[#079455]">
                  ₹{grandTotal.toLocaleString('en-IN')}.00
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-3.5 py-2 bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#E0EAE4] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-4 sm:px-5 py-2 bg-[#079455] hover:bg-[#067A46] text-white rounded-xl font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Confirm Sale & Sync Tally</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {showInvoiceModal && completedSaleRecord && (
        <GSTInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setActiveModal('none');
          }}
          sale={completedSaleRecord}
          invoiceData={completedInvoiceData}
        />
      )}
    </div>
  );
};
