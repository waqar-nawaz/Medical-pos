const { z } = require('zod');
const Expense = require('../models/expense.model');

const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries',
  'Electricity',
  'Water',
  'Internet & Phone',
  'Packaging & Supplies',
  'Transport',
  'Repairs & Maintenance',
  'Licenses & Tax',
  'Marketing',
  'Miscellaneous',
];

const schema = z.object({
  category: z.string().min(2).max(60),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  date: z.string().min(1), // YYYY-MM-DD
});

function list(req, res) {
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  const q = req.query.q ? String(req.query.q) : '';
  const limit = Number(req.query.limit || 200);
  const offset = Number(req.query.offset || 0);
  res.json({ ok: true, data: Expense.list({ from, to, q, limit, offset }) });
}

function create(req, res) {
  const body = schema.parse(req.body);
  const row = Expense.create({ ...body, userId: req.user.id });
  res.status(201).json({ ok: true, data: row });
}

function update(req, res) {
  const id = Number(req.params.id);
  const body = schema.parse(req.body);
  const exists = Expense.getById(id);
  if (!exists) return res.status(404).json({ ok: false, error: { message: 'Expense not found' } });
  const row = Expense.update(id, body);
  res.json({ ok: true, data: row });
}

function remove(req, res) {
  const id = Number(req.params.id);
  Expense.remove(id);
  res.json({ ok: true });
}

function summary(req, res) {
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  res.json({ ok: true, data: Expense.summary({ from, to }) });
}

module.exports = { list, create, update, remove, summary, EXPENSE_CATEGORIES };