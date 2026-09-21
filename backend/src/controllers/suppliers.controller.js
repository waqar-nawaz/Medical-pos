const { z } = require('zod');
const Supplier = require('../models/supplier.model');

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  note:   z.string().optional().default(''),
});

function list(req, res) {
  const q = String(req.query.q || '');
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  res.json({ ok: true, data: Supplier.list({ q, limit, offset }) });
}

function get(req, res) {
  res.json({ ok: true, data: Supplier.getById(Number(req.params.id)) || null });
}

function create(req, res) {
  const data = schema.parse(req.body);
  res.status(201).json({ ok: true, data: Supplier.create(data) });
}

function update(req, res) {
  const data = schema.parse(req.body);
  res.json({ ok: true, data: Supplier.update(Number(req.params.id), data) });
}

function remove(req, res) {
  Supplier.remove(Number(req.params.id));
  res.json({ ok: true });
}

function listPayments(req, res) {
  res.json({ ok: true, data: Supplier.listPayments(Number(req.params.id)) });
}

function recordPayment(req, res) {
  const body = paymentSchema.parse(req.body);
  res.status(201).json(Supplier.recordPayment({
    supplierId: Number(req.params.id),
    amount:     body.amount,
    note:       body.note,
    userId:     req.user?.id ?? null,
  }));
}

module.exports = { list, get, create, update, remove, listPayments, recordPayment };
