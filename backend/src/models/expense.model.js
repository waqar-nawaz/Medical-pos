const { getDb } = require('../config/db');

function buildListQuery({ from, to, q }) {
  const params = [];
  const clauses = [];
  if (from && to) {
    clauses.push('date BETWEEN ? AND ?');
    params.push(from, to);
  }
  if (q && String(q).trim()) {
    clauses.push('(category LIKE ? OR description LIKE ?)');
    const like = `%${String(q).trim()}%`;
    params.push(like, like);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function create({ category, description, amount, date, userId }) {
  const db = getDb();
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO expenses (category, description, amount, date, userId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(category, description || '', Number(amount) || 0, date, userId, now);
  return getById(info.lastInsertRowid);
}

function getById(id) {
  return getDb().prepare(`
    SELECT e.*, u.name AS userName
    FROM expenses e LEFT JOIN users u ON u.id = e.userId WHERE e.id = ?
  `).get(id);
}

function list({ from, to, q, limit = 200, offset = 0 }) {
  const db = getDb();
  const { where, params } = buildListQuery({ from, to, q });
  params.push(limit, offset);
  return db.prepare(`
    SELECT e.*, u.name AS userName
    FROM expenses e LEFT JOIN users u ON u.id = e.userId
    ${where}
    ORDER BY e.date DESC, e.id DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}

function summary({ from, to }) {
  const db = getDb();
  const { where, params } = buildListQuery({ from, to, q: '' });
  const total = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
    FROM expenses ${where}
  `).get(...params);
  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
    FROM expenses ${where}
    GROUP BY category ORDER BY total DESC
  `).all(...params);
  return { total: Number(total.total) || 0, count: total.count, byCategory };
}

function update(id, { category, description, amount, date }) {
  const db = getDb();
  db.prepare(`
    UPDATE expenses SET category = ?, description = ?, amount = ?, date = ?, createdAt = createdAt
    WHERE id = ?
  `).run(category, description || '', Number(amount) || 0, date, id);
  return getById(id);
}

function remove(id) {
  return getDb().prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

module.exports = { create, getById, list, summary, update, remove };