const { getDb } = require('../config/db');

const PUBLIC_FIELDS = 'id, email, name, role, permissions, createdAt, updatedAt';

function parseUser(row) {
  if (!row) return null;
  return { ...row, permissions: JSON.parse(row.permissions || '[]') };
}

function findByEmail(email) {
  const db = getDb();
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

function findById(id) {
  const db = getDb();
  return parseUser(db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id));
}

function list() {
  const db = getDb();
  return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY createdAt ASC`)
    .all().map(parseUser);
}

function createUser({ email, name, role, passwordHash, permissions }) {
  const db = getDb();
  const now = new Date().toISOString();
  const stored = JSON.stringify(permissions || []);
  const stmt = db.prepare(`INSERT INTO users (email, name, role, passwordHash, permissions, createdAt, updatedAt)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(email, name, role, passwordHash, stored, now, now);
  return findById(info.lastInsertRowid);
}

function updateUser(id, { email, name, role, permissions }) {
  const db = getDb();
  const now = new Date().toISOString();
  const stored = JSON.stringify(permissions || []);
  db.prepare(`UPDATE users SET email = ?, name = ?, role = ?, permissions = ?, updatedAt = ? WHERE id = ?`)
    .run(email, name, role, stored, now, id);
  return findById(id);
}

function updatePassword(userId, passwordHash) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?').run(passwordHash, now, userId);
}

function deleteUser(id) {
  const db = getDb();
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

module.exports = { findByEmail, findById, list, createUser, updateUser, updatePassword, deleteUser };