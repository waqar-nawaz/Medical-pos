const { getDb } = require('../config/db');
const { AppError } = require('../utils/errors');

function adjust({ productId, userId, qtyChange, reason, note }) {
  const db = getDb();
  const now = new Date().toISOString();
  const change = Math.trunc(Number(qtyChange) || 0);
  if (change === 0) throw new AppError('Quantity change cannot be zero', 400, 'INVALID_QTY');

  return db.transaction(() => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
    const newQty = Number(product.stockQty || 0) + change;
    if (newQty < 0) throw new AppError('Stock cannot go below zero', 400, 'INVALID_QTY');

    db.prepare('UPDATE products SET stockQty = ?, updatedAt = ? WHERE id = ?').run(newQty, now, productId);
    const info = db.prepare(`
      INSERT INTO stock_adjustments (productId, userId, qtyChange, reason, note, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(productId, userId, change, reason, note || '', now);

    return { id: info.lastInsertRowid, productId, userId, qtyChange: change, newQty, reason, note: note || '', createdAt: now };
  })();
}

function list({ productId, limit = 100, offset = 0 }) {
  const db = getDb();
  const params = [];
  let where = '';
  if (productId) {
    where = 'WHERE sa.productId = ?';
    params.push(Number(productId));
  }
  params.push(limit, offset);
  return db.prepare(`
    SELECT sa.*, p.name AS productName, u.name AS userName
    FROM stock_adjustments sa
    LEFT JOIN products p ON p.id = sa.productId
    LEFT JOIN users u ON u.id = sa.userId
    ${where}
    ORDER BY sa.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(...params);
}

module.exports = { adjust, list };