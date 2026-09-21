const { z } = require('zod');
const StockAdjustment = require('../models/stockAdjustment.model');

const REASONS = ['RECEIVED', 'DAMAGED', 'EXPIRED', 'COUNT_CORRECTION', 'SAMPLE', 'OTHER'];

const adjustSchema = z.object({
  qtyChange: z.number().int().min(-100000).max(100000),
  reason: z.enum(REASONS),
  note: z.string().optional().nullable(),
});

function adjustProduct(req, res) {
  const productId = Number(req.params.id);
  const body = adjustSchema.parse(req.body);
  const row = StockAdjustment.adjust({
    productId,
    userId: req.user.id,
    qtyChange: body.qtyChange,
    reason: body.reason,
    note: body.note,
  });
  res.status(201).json({ ok: true, data: row });
}

function list(req, res) {
  const productId = req.query.productId ? Number(req.query.productId) : null;
  const limit = Number(req.query.limit || 100);
  const offset = Number(req.query.offset || 0);
  res.json({ ok: true, data: StockAdjustment.list({ productId, limit, offset }) });
}

module.exports = { adjustProduct, list, REASONS, adjustSchema };