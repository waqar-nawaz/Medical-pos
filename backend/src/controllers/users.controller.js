const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { AppError } = require('../utils/errors');
const { PERMISSIONS, defaultPermissions } = require('../utils/permissions');
const User = require('../models/user.model');

const VALID_ROLES = ['admin', 'cashier'];

const createSchema = z.object({
  email: z.string().min(1),
  name: z.string().min(2).max(80),
  password: z.string().min(6).max(128),
  role: z.enum(VALID_ROLES).default('cashier'),
  permissions: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  email: z.string().min(1),
  name: z.string().min(2).max(80),
  role: z.enum(VALID_ROLES),
  permissions: z.array(z.string()),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6).max(128),
});

function list(req, res) {
  res.json({ ok: true, data: User.list() });
}

function create(req, res) {
  const body = createSchema.parse(req.body);
  const email = body.email.toLowerCase();
  if (User.findByEmail(email)) throw new AppError('Email already exists', 409, 'AUTH_EXISTS');

  const passwordHash = bcrypt.hashSync(body.password, 10);
  const user = User.createUser({
    email,
    name: body.name,
    role: body.role,
    passwordHash,
    permissions: body.permissions.length ? body.permissions : defaultPermissions(body.role),
  });
  res.status(201).json({ ok: true, data: user });
}

function update(req, res) {
  const id = Number(req.params.id);
  const existing = User.findById(id);
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');

  const body = updateSchema.parse(req.body);
  const email = body.email.toLowerCase();
  const conflict = User.findByEmail(email);
  if (conflict && conflict.id !== id) throw new AppError('Email already exists', 409, 'AUTH_EXISTS');

  if (id === req.user.id && body.role !== existing.role) {
    throw new AppError('You cannot change your own role', 400, 'BAD_REQUEST');
  }

  if (existing.role === 'admin' && body.role !== 'admin') {
    const adminCount = User.list().filter(u => u.role === 'admin').length;
    if (adminCount <= 1) throw new AppError('Cannot demote the last admin', 400, 'BAD_REQUEST');
  }

  const user = User.updateUser(id, {
    email,
    name: body.name,
    role: body.role,
    permissions: body.permissions,
  });
  res.json({ ok: true, data: user });
}

function resetPassword(req, res) {
  const id = Number(req.params.id);
  const existing = User.findById(id);
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');

  const body = resetPasswordSchema.parse(req.body);
  const passwordHash = bcrypt.hashSync(body.password, 10);
  User.updatePassword(id, passwordHash);
  res.json({ ok: true });
}

function remove(req, res) {
  const id = Number(req.params.id);
  const existing = User.findById(id);
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (existing.role === 'admin') throw new AppError('Cannot delete an admin user', 400, 'BAD_REQUEST');
  if (id === req.user.id) throw new AppError('You cannot delete your own account', 400, 'BAD_REQUEST');

  User.deleteUser(id);
  res.json({ ok: true });
}

module.exports = { list, create, update, resetPassword, remove, VALID_ROLES, PERMISSIONS };