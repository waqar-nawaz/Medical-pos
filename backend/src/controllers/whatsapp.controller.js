const { z } = require('zod');
const Sales = require('../models/sales.model');
const Settings = require('../models/settings.model');
const { buildInvoiceMessage, buildWhatsAppLink } = require('../services/whatsapp.service');

const schema = z.object({
  saleId: z.number().int(),
  phone: z.string().min(5),
});

function invoiceLink(req, res) {
  const body = schema.parse(req.body);
  const sale = Sales.getById(body.saleId);
  if (!sale) return res.status(404).json({ ok: false, error: { message: 'Sale not found' } });

  const settings = Settings.get() || { storeName: 'Medical POS' };
  const msg = buildInvoiceMessage({ invoiceNo: sale.invoiceNo, amount: sale.grandTotal, storeName: settings.storeName });
  const url = buildWhatsAppLink(body.phone, msg);

  res.json({ ok: true, data: { url } });
}

module.exports = { invoiceLink };
