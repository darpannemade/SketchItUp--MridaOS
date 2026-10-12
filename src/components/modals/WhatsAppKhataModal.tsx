import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  MessageCircle,
  QrCode,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  IndianRupee,
  Clock,
  Sparkles,
} from 'lucide-react';
import { whatsAppUpiService, KhataReminderPayload } from '../../services/whatsAppUpiService';

interface WhatsAppKhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    khataBalance: number;
    daysOverdue?: number;
    village?: string;
  };
}

export const WhatsAppKhataModal: React.FC<WhatsAppKhataModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { showToast, recordKhataPayment } = useApp();
  const [language, setLanguage] = useState<'marathi' | 'english'>('marathi');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [upiIntentUri, setUpiIntentUri] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !customer) return;

    const overdueDays = customer.daysOverdue || 45;
    const payload: KhataReminderPayload = {
      farmerName: customer.name,
      farmerPhone: customer.phone,
      outstandingBalance: customer.khataBalance,
      overdueDays,
      invoiceList: ['INV-2026-00101', 'INV-2026-00102'],
      village: customer.village,
      language,
    };

    const { messageText: msg, upiIntent } = whatsAppUpiService.buildKhataReminderMessage(payload);
    setMessageText(msg);
    setUpiIntentUri(upiIntent.upiUri);

    whatsAppUpiService.generateUpiQrCode(upiIntent.upiUri).then((url) => {
      setQrDataUrl(url);
    });
  }, [isOpen, customer, language]);

  if (!isOpen || !customer) return null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast('WhatsApp reminder message copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const url = whatsAppUpiService.getWhatsAppClickUrl(customer.phone, messageText);
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`WhatsApp chat launched for ${customer.name}`, 'success');
  };

  const handleInstantReconciliation = () => {
    recordKhataPayment(customer.id, customer.khataBalance, 'upi');
    showToast(`✅ Khata reconciled: ₹${customer.khataBalance.toLocaleString('en-IN')} settled via UPI`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#242924] w-full max-w-xl rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-[#079455]">
              <MessageCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
                WhatsApp Khata Recovery & 1-Click UPI Payment
              </h3>
              <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
                Polite payment reminder with embedded dynamic UPI intent link and scan-to-pay QR
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
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Customer & Outstanding Pill */}
          <div className="p-4 rounded-2xl bg-[#F9FBFA] dark:bg-[#1E241E] border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{customer.name}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{customer.phone}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Balance</span>
              <span className="text-base font-black text-rose-600">
                ₹{customer.khataBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Dynamic UPI QR Code & Intent Details */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            {qrDataUrl ? (
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0">
                <img src={qrDataUrl} alt="UPI QR Code" className="w-32 h-32" />
              </div>
            ) : null}

            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-[#079455]" />
                <span>Dynamic NPCI UPI Intent Configured</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Tapping the WhatsApp link on farmer's phone automatically opens GPay, PhonePe, or Paytm with exact balance <strong>₹{customer.khataBalance}</strong> and ledger note prefilled!
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-500 bg-white/70 dark:bg-black/30 p-2 rounded-lg break-all">
                {upiIntentUri}
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Reminder Message Dialect:
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setLanguage('marathi')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                  language === 'marathi'
                    ? 'bg-[#079455] text-white shadow-2xs'
                    : 'bg-[#F0F4F1] dark:bg-[#1A1F1A] text-[#6E7B74]'
                }`}
              >
                मराठी (Marathi)
              </button>
              <button
                onClick={() => setLanguage('english')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                  language === 'english'
                    ? 'bg-[#079455] text-white shadow-2xs'
                    : 'bg-[#F0F4F1] dark:bg-[#1A1F1A] text-[#6E7B74]'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Message Preview */}
          <div className="relative">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
              {messageText}
            </div>

            <button
              onClick={handleCopyMessage}
              className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-600 shadow-2xs flex items-center gap-1 hover:bg-slate-50"
            >
              {copied ? <CheckCircle2 className="w-3 h-3 text-[#079455]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={handleInstantReconciliation}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[#079455] text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Received / Reconcile Now</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Send via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
