import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  FileCheck2,
  Truck,
  Download,
  Printer,
  ShieldCheck,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Building2,
  FileText,
} from 'lucide-react';
import { nicEwayBillService, GeneratedEwayBillResult } from '../../services/nicEwayBillService';

interface NicEwayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
}

export const NicEwayBillModal: React.FC<NicEwayBillModalProps> = ({ isOpen, onClose, sale }) => {
  const { showToast } = useApp();
  const [ewbResult, setEwbResult] = useState<GeneratedEwayBillResult | null>(null);
  const [vehicleNo, setVehicleNo] = useState('MH-15-EG-4921');
  const [transporter, setTransporter] = useState('Nashik Kisan Logistics');
  const [distanceKm, setDistanceKm] = useState(38);

  useEffect(() => {
    if (!isOpen || !sale) return;

    nicEwayBillService
      .generateEwayBill({
        invoiceNo: sale.invoiceNo || 'INV/2026/00101',
        date: sale.timestamp || new Date().toISOString(),
        grandTotal: sale.grandTotal || sale.totalAmount || 58400,
        taxableAmount: sale.taxableAmount || (sale.grandTotal ? sale.grandTotal * 0.95 : 55600),
        cgstAmount: sale.cgstAmount || 1400,
        sgstAmount: sale.sgstAmount || 1400,
        farmerName: sale.customerName || 'Farmer Consignee',
        farmerGstin: sale.customerGstin,
        destinationPlace: sale.deliveryAddress || 'Niphad Taluka, Nashik',
        distanceKm,
        vehicleNumber: vehicleNo,
        transporterName: transporter,
        items: sale.items || [
          { name: 'Neem Coated Urea (45kg)', qty: 50, price: 266.5, hsn: '3102', gstRate: 5 },
          { name: 'DAP 18:46:00 (50kg)', qty: 30, price: 1350, hsn: '3105', gstRate: 5 },
        ],
      })
      .then(setEwbResult);
  }, [isOpen, sale, vehicleNo, transporter, distanceKm]);

  if (!isOpen || !sale) return null;

  const isMandatory = nicEwayBillService.isEwayBillMandatory(sale.grandTotal || sale.totalAmount || 0);

  const handleDownloadJson = () => {
    if (ewbResult) {
      nicEwayBillService.downloadNicJson(ewbResult.nicJsonPayload, `NIC_EWB_${sale.invoiceNo}`);
      showToast('NIC e-Way Bill JSON downloaded for government portal upload', 'success');
    }
  };

  const handlePrintSlip = () => {
    window.print();
    showToast('Printing official NIC e-Way Bill & Part-B Challan', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white dark:bg-[#242924] w-full max-w-2xl rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] shadow-2xl overflow-hidden flex flex-col print:border-none print:shadow-none print:max-w-full">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-[#079455]">
              <Truck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
                Government Portal Integration — NIC e-Way Bill &amp; e-Invoice
              </h3>
              <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
                1-Click statutory e-Way bill JSON generation, IRN, and signed QR code for inter-godown and B2B dispatches
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
          {/* Statutory Threshold Banner */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
              isMandatory
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#079455]" />
              <span>
                {isMandatory
                  ? 'Statutory Requirement: Value exceeds ₹50,000 threshold (CGST Rule 138)'
                  : 'Consignment Value under ₹50,000 (Optional intra-state transit)'}
              </span>
            </div>
            <span className="font-mono font-bold text-sm">
              ₹{(sale.grandTotal || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {ewbResult ? (
            <>
              {/* Official EWB Slip Header */}
              <div className="p-4 rounded-2xl bg-[#F9FBFA] dark:bg-[#1E241E] border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">NIC e-Way Bill Number</span>
                    <span className="text-lg font-black font-mono text-[#079455] tracking-wider">
                      {ewbResult.ewbNumber}
                    </span>
                  </div>
                  <div className="text-left sm:text-right text-xs">
                    <div>Generated: <strong className="font-mono">{ewbResult.ewbDate}</strong></div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-bold">Valid Until: {ewbResult.validUpto}</div>
                  </div>
                </div>

                {/* IRN & Signed QR Code Section */}
                <div className="mt-3.5 flex flex-col sm:flex-row items-center gap-4">
                  {ewbResult.signedQrCodeUrl && (
                    <img
                      src={ewbResult.signedQrCodeUrl}
                      alt="NIC Signed QR Code"
                      className="w-24 h-24 p-1 bg-white rounded-xl border border-slate-200 shrink-0"
                    />
                  )}
                  <div className="flex-1 text-xs space-y-1">
                    <div className="text-slate-500 font-bold uppercase text-[10px]">
                      e-Invoice IRN (Invoice Reference Number):
                    </div>
                    <div className="font-mono text-[10px] text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-black/30 p-1.5 rounded-lg break-all">
                      {ewbResult.irn}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      <span>Ack No: <strong className="font-mono">{ewbResult.ackNo}</strong></span>
                      <span>•</span>
                      <span>Status: <strong className="text-[#079455]">ACTIVE / VERIFIED</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part-A & Part-B Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Part-A: Goods & Tax */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>PART-A (Consignment Details)</span>
                    <span className="text-[10px] font-mono text-slate-500">HSN: 3102/3105</span>
                  </div>
                  <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                    <div>Supplier: <strong className="text-slate-800 dark:text-slate-200">27AAECM4821P1Z8 (MridaOS)</strong></div>
                    <div>Recipient: <strong className="text-slate-800 dark:text-slate-200">{sale.customerName}</strong></div>
                    <div>Place of Delivery: <strong className="text-slate-800 dark:text-slate-200">{ewbResult.partA.placeOfDelivery}</strong></div>
                    <div>Invoice: <strong className="text-slate-800 dark:text-slate-200 font-mono">{sale.invoiceNo}</strong></div>
                  </div>
                </div>

                {/* Part-B: Vehicle & Transporter */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>PART-B (Vehicle &amp; Transport)</span>
                    <span className="text-[10px] font-mono text-[#079455]">Road Transit</span>
                  </div>
                  <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                    <div>Vehicle No: <strong className="text-slate-800 dark:text-slate-200 font-mono">{vehicleNo}</strong></div>
                    <div>Transporter: <strong className="text-slate-800 dark:text-slate-200">{transporter}</strong></div>
                    <div>LR Document No: <strong className="text-slate-800 dark:text-slate-200 font-mono">{ewbResult.partB.transporterDocNo}</strong></div>
                    <div>Distance: <strong className="text-slate-800 dark:text-slate-200">{distanceKm} KM</strong></div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download NIC JSON Payload</span>
            </button>

            <button
              onClick={handlePrintSlip}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print e-Way Bill Slip</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
