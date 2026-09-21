const { getDb } = require('../config/db');
const { nanoid } = require('nanoid');
const { AppError } = require('../utils/errors');

function list({ limit = 50, offset = 0 }) {
  const db = getDb();
  return db.prepare(`
    SELECT po.*, s.name AS supplierName
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplierId
    ORDER BY po.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function getById(id) {
  const db = getDb();
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  if (!po) return null;
  const items = db.prepare(`
    SELECT poi.*, p.name AS productName
    FROM purchase_order_items poi
    JOIN products p ON p.id = poi.productId
    WHERE poi.purchaseOrderId = ?
  `).all(id);
  return { ...po, items };
}

function create({ userId, supplierId = null, items = [] }) {
  const db = getDb();
  const now = new Date().toISOString();
  const poNo = `PO-${day(now)}-${nanoid(6).toUpperCase()}`;

  return db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO purchase_orders (poNo, userId, supplierId, status, createdAt, updatedAt)
      VALUES (?, ?, ?, 'DRAFT', ?, ?)
    `).run(poNo, userId, supplierId, now, now);

    const poId = info.lastInsertRowid;

    const itemStmt = db.prepare(`
      INSERT INTO purchase_order_items (purchaseOrderId, productId, qty, cost)
      VALUES (?, ?, ?, ?)
    `);

    for (const it of items) {
      const qty = Number(it.qty || 0);
      if (qty <= 0) continue;
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId);
      if (!product) throw new AppError('Invalid product', 400, 'INVALID_PRODUCT');
      const cost = Number(it.cost ?? product.cost ?? 0);
      itemStmt.run(poId, it.productId, qty, cost);
    }

    return getById(poId);
  })();
}

function receive(poId, userId) {
  const db = getDb();
  const now = new Date().toISOString();

  return db.transaction(() => {
    const po = getById(poId);
    if (!po) throw new AppError('PO not found', 404, 'NOT_FOUND');
    if (po.status === 'RECEIVED') throw new AppError('Already received', 400, 'ALREADY_RECEIVED');

    const stockStmt = db.prepare('UPDATE products SET stockQty = stockQty + ?, cost = ?, updatedAt = ? WHERE id = ?');
    const adjStmt = db.prepare(`
      INSERT INTO stock_adjustments (productId, userId, qtyChange, reason, note, createdAt)
      VALUES (?, ?, ?, 'RECEIVED', ?, ?)
    `);

    for (const it of po.items) {
      stockStmt.run(it.qty, it.cost, now, it.productId);
      adjStmt.run(it.productId, userId, it.qty, `PO ${po.poNo}`, now);
    }

    db.prepare(`UPDATE purchase_orders SET status='RECEIVED', updatedAt=? WHERE id=?`).run(now, poId);
    return getById(poId);
  })();
}

// Reorder suggestions for low-stock items, ready to build a PO
function suggest() {
  const db = getDb();
  return db.prepare(`
    SELECT p.id AS productId, p.name, p.stockQty, p.reorderLevel, p.shelf, p.cost,
           p.supplierId, s.name AS supplierName,
           CASE WHEN p.stockQty <= 0 THEN 'Out of Stock' ELSE 'Low Stock' END AS status,
           MAX(1, (p.reorderLevel * 2) - p.stockQty) AS suggestQty
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplierId
    WHERE p.isActive = 1 AND p.stockQty <= p.reorderLevel
    ORDER BY (p.stockQty * 2 - p.reorderLevel) ASC, p.name ASC
  `).all();
}

function day(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

module.exports = { list, getById, create, receive, suggest };
