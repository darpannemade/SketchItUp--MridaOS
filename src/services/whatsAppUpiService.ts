/**
 * WhatsApp Cloud API & Dynamic UPI Intent Service
 * - Instant WhatsApp Tax Invoices & Delivery Challans to Farmer's Phone
 * - 1-Click Dynamic UPI Intent Link Generator (upi://pay?pa=...&am=...&pn=MridaOS)
 * - Khata Credit Recovery reminders with QR code & WhatsApp dispatch
 */

import QRCode from 'qrcode';

export interface WhatsAppInvoicePayload {
  farmerPhone: string;
  farmerName: string;
  invoiceNo: string;
  grandTotal: number;
  items: { name: string; qty: number; price: number }[];
  date: string;
  gstin?: string;
  language?: 'english' | 'marathi' | 'hindi';
}

export interface UpiPaymentIntent {
  payeeVpa: string; // e.g. mridaos@icici
  payeeName: string; // e.g. MridaOS Agri Retail
  amount: number;
  transactionNote: string;
  transactionRef?: string;
  upiUri: string;
  qrDataUrl?: string;
}

export interface KhataReminderPayload {
  farmerName: string;
  farmerPhone: string;
  outstandingBalance: number;
  overdueDays: number;
  invoiceList: string[];
  village?: string;
  payeeVpa?: string;
  payeeName?: string;
  language?: 'english' | 'marathi' | 'hindi';
}

class WhatsAppUpiService {
  private defaultVpa = 'mridaos.nashik@icici';
  private defaultBusinessName = 'MridaOS Agri Solutions';

  /**
   * Generates standard NPCI UPI Intent URI
   * Format: upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={note}
   */
  public generateUpiIntent(params: {
    amount: number;
    transactionNote: string;
    payeeVpa?: string;
    payeeName?: string;
    refId?: string;
  }): UpiPaymentIntent {
    const vpa = params.payeeVpa || this.defaultVpa;
    const name = encodeURIComponent(params.payeeName || this.defaultBusinessName);
    const amt = params.amount.toFixed(2);
    const note = encodeURIComponent(params.transactionNote);
    const ref = params.refId ? `&tr=${encodeURIComponent(params.refId)}` : '';

    const upiUri = `upi://pay?pa=${vpa}&pn=${name}&am=${amt}&cu=INR&tn=${note}${ref}`;

    return {
      payeeVpa: vpa,
      payeeName: params.payeeName || this.defaultBusinessName,
      amount: params.amount,
      transactionNote: params.transactionNote,
      transactionRef: params.refId,
      upiUri,
    };
  }

  /**
   * Generates Base64 Data URL for UPI QR Code
   */
  public async generateUpiQrCode(upiUri: string): Promise<string> {
    try {
      return await QRCode.toDataURL(upiUri, {
        width: 320,
        margin: 2,
        color: {
          dark: '#079455',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('Failed to generate UPI QR code', err);
      return '';
    }
  }

  /**
   * Builds the formatted WhatsApp invoice message text
   */
  public buildInvoiceMessage(payload: WhatsAppInvoicePayload): string {
    const cleanPhone = payload.farmerPhone.replace(/\D/g, '');
    const itemsSummary = payload.items
      .map((it, idx) => `  ${idx + 1}. ${it.name} x ${it.qty} = ₹${(it.qty * it.price).toLocaleString('en-IN')}`)
      .join('\n');

    if (payload.language === 'marathi') {
      return `🌾 *मृदा ऍग्री रिटेल - अधिकृत टॅक्स इनव्हॉइस* 🌾\n\n` +
        `नमस्कार *${payload.farmerName}* जी,\n` +
        `आपल्या खत खरेदीचे बिल यशस्वीरीत्या तयार झाले आहे.\n\n` +
        `🧾 *बिल क्र:* ${payload.invoiceNo}\n` +
        `📅 *तारीख:* ${payload.date}\n` +
        `🏪 *शाखा:* नाशिक सेंट्रल गोडाऊन\n\n` +
        `*खरेदी तपशील:*\n${itemsSummary}\n\n` +
        `💰 *एकूण रक्कम:* *₹${payload.grandTotal.toLocaleString('en-IN')}*\n` +
        `✅ *FCO & DBT Subsidy:* शासन अनुदानीत दर लागू\n\n` +
        `आपले डिजिटल इनव्हॉइस डाऊनलोड करण्यासाठी खालील लिंकवर क्लिक करा:\n` +
        `🔗 https://mridaos.agri/invoices/${encodeURIComponent(payload.invoiceNo)}\n\n` +
        `शेती समृद्धीसाठी धन्यवाद! 🙏\n_MridaOS Agri Solutions Nashik_`;
    }

    if (payload.language === 'hindi') {
      return `🌾 *मृदा एग्री रिटेल - अधिकृत टैक्स चालान* 🌾\n\n` +
        `नमस्ते *${payload.farmerName}* जी,\n` +
        `आपकी उर्वरक खरीद का बिल जारी कर दिया गया है।\n\n` +
        `🧾 *बिल संख्या:* ${payload.invoiceNo}\n` +
        `📅 *दिनांक:* ${payload.date}\n\n` +
        `*खरीद विवरण:*\n${itemsSummary}\n\n` +
        `💰 *कुल देय राशि:* *₹${payload.grandTotal.toLocaleString('en-IN')}*\n` +
        `✅ *FCO & DBT Subsidy:* सब्सिडी दरें सत्यापित\n\n` +
        `डिजिटल इनवॉइस डाउनलोड लिंक:\n` +
        `🔗 https://mridaos.agri/invoices/${encodeURIComponent(payload.invoiceNo)}\n\n` +
        `धन्यवाद! 🙏\n_MridaOS Agri Solutions_`;
    }

    // Default English
    return `🌾 *MridaOS Agri Retail - Official Tax Invoice* 🌾\n\n` +
      `Dear *${payload.farmerName}*,\n` +
      `Thank you for your purchase. Your tax invoice is ready:\n\n` +
      `🧾 *Invoice No:* ${payload.invoiceNo}\n` +
      `📅 *Date:* ${payload.date}\n` +
      `🏢 *Branch:* Nashik Central Godown & PoS\n\n` +
      `*Items Purchased:*\n${itemsSummary}\n\n` +
      `💰 *Grand Total:* *₹${payload.grandTotal.toLocaleString('en-IN')}*\n` +
      `✅ *Subsidy Status:* FCO 1985 & iFMS DBT Compliant\n\n` +
      `Download your official PDF Tax Invoice & Delivery Challan:\n` +
      `🔗 https://mridaos.agri/invoices/${encodeURIComponent(payload.invoiceNo)}\n\n` +
      `For any assistance, call our Godown helpline: +91 98220 11234.\n` +
      `_MridaOS Enterprise_`;
  }

  /**
   * Generates 1-Click WhatsApp Khata Recovery Reminder with Embedded Dynamic UPI Intent Link
   */
  public buildKhataReminderMessage(payload: KhataReminderPayload): {
    messageText: string;
    upiIntent: UpiPaymentIntent;
  } {
    const upiIntent = this.generateUpiIntent({
      amount: payload.outstandingBalance,
      transactionNote: `MridaOS Khata ${payload.farmerName}`,
      payeeVpa: payload.payeeVpa || this.defaultVpa,
      payeeName: payload.payeeName || this.defaultBusinessName,
    });

    const amountFormatted = `₹${payload.outstandingBalance.toLocaleString('en-IN')}`;
    const invoiceListText = payload.invoiceList.length > 0 ? payload.invoiceList.join(', ') : 'चालू खाते बिल';

    let messageText = '';
    if (payload.language === 'marathi') {
      messageText = `🌾 *मृदा ऍग्री रिटेल - शेतकरी खाते स्मरणपत्र* 🌾\n\n` +
        `नमस्कार *${payload.farmerName}* जी,\n` +
        `आपल्या नावे जुन्या बिलांचे (बिलांचा संदर्भ: ${invoiceListText}) एकूण *${amountFormatted}* थकीत बाकी आहे (कालावधी: ${payload.overdueDays} दिवस).\n\n` +
        `नवीन खत व बियाणे उधारी कोटा चालू ठेवण्यासाठी कृपया थकीत रक्कम लवकरात लवकर जमा करावी.\n\n` +
        `📲 *१-क्लिक UPI द्वारे घरबसल्या लगेच भरा:*\n` +
        `Google Pay, PhonePe किंवा Paytm ने भरण्यासाठी खालील लिंकवर टॅप करा:\n` +
        `👉 ${upiIntent.upiUri}\n\n` +
        `UPI ID: *${upiIntent.payeeVpa}*\n` +
        `रक्कम: *${amountFormatted}*\n\n` +
        `पैसे भरल्यानंतर पावती लगेच व्हॉट्सॲपवर मिळेल. काही अडचण असल्यास संपर्क करा: +91 98220 11234.\n` +
        `आपले नम्र,\n_मृदा ऍग्री सोल्युशन्स, नाशिक_`;
    } else {
      messageText = `🌾 *MridaOS Agri - Khata Balance Reminder* 🌾\n\n` +
        `Respected *${payload.farmerName}*,\n` +
        `This is a gentle reminder regarding your pending Khata credit balance of *${amountFormatted}* for past fertilizer supplies (Ref: ${invoiceListText}, Overdue: ${payload.overdueDays} days).\n\n` +
        `To maintain your seasonal credit line for the upcoming sowing cycle, kindly clear this outstanding amount.\n\n` +
        `📲 *1-Tap Instant UPI Payment (Google Pay / PhonePe / Paytm / BHIM):*\n` +
        `👉 ${upiIntent.upiUri}\n\n` +
        `Direct UPI ID: *${upiIntent.payeeVpa}*\n` +
        `Amount: *${amountFormatted}*\n\n` +
        `Your ledger will be automatically reconciled upon receipt. Thank you for your continued partnership!\n` +
        `_MridaOS Agri Solutions, Nashik_`;
    }

    return { messageText, upiIntent };
  }

  /**
   * Generates WhatsApp Click-to-Chat URL
   * Opens WhatsApp Web or Native App with phone & encoded message
   */
  public getWhatsAppClickUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  }
}

export const whatsAppUpiService = new WhatsAppUpiService();
