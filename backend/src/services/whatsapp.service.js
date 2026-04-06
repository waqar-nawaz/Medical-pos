function buildInvoiceMessage({ invoiceNo, amount, storeName }) {
  return `*${storeName}*\nInvoice: ${invoiceNo}\nAmount: ${amount}\nThank you for your purchase.`;
}

function buildWhatsAppLink(phone, message) {
  // Accept phone as digits with country code (e.g., 92xxxxxxxxxx)
  const normalized = String(phone || '').replace(/[^\d]/g, '');
  const txt = encodeURIComponent(message || '');
  return `https://wa.me/${normalized}?text=${txt}`;
}

module.exports = { buildInvoiceMessage, buildWhatsAppLink };
