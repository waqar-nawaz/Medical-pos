const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { config } = require('../config/env');
const { AppError } = require('../utils/errors');
const User = require('../models/user.model');

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().min(1),
  password: z.string().min(8).max(128),
});

async function login(req, res) {
  try {
    const body = loginSchema.parse(req.body);
    const u = User.findByEmail(body.email.toLowerCase());

    if (!u) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid credentials'
      });
    }

    const ok = bcrypt.compare(body.password, u.passwordHash);

    if (!ok) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: u.id, email: u.email, role: u.role, name: u.name },
      config.jwtSecret,
      { expiresIn: '12h' }
    );

    res.json({
      ok: true,
      token,
      user: { id: u.id, email: u.email, role: u.role, name: u.name }
    });

  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || 'Server Error'
    });
  }
}

async function register(req, res) {
  const body = registerSchema.parse(req.body);
  const email = body.email.toLowerCase();
  if (User.findByEmail(email)) throw new AppError('Email already exists', 409, 'AUTH_EXISTS');

  const passwordHash = bcrypt.hashSync(body.password, 10);
  const user = User.createUser({ email, name: body.name, role: 'cashier', passwordHash });

  res.status(201).json({ ok: true, user });
}

function me(req, res) {
  const user = User.findById(req.user.id);
  res.json({ ok: true, user });
}

const changeSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8).max(128),
});

async function changePassword(req, res) {
  const body = changeSchema.parse(req.body);
  const u = User.findByEmail(req.user.email);
  if (!u) throw new AppError('User not found', 404, 'NOT_FOUND');

  const ok = bcrypt.compareSync(body.currentPassword, u.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 400, 'BAD_PASSWORD');

  const passwordHash = bcrypt.hashSync(body.newPassword, 10);
  User.updatePassword(u.id, passwordHash);

  res.json({ ok: true });
}

module.exports = { login, register, me, changePassword };
