const { getDb } = require('../config/db');

function list({ q = '', limit = 50, offset = 0 }) {
  const db = getDb();
  const like = `%${q}%`;
  const rows = db.prepare(`
    SELECT s.*,
      (SELECT IFNULL(SUM(
        (SELECT IFNULL(SUM(poi.qty * poi.cost), 0) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) - po.paid), 0)
        FROM purchase_orders po WHERE po.supplierId = s.id AND po.status = 'RECEIVED') AS payable
    FROM suppliers s
    WHERE s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?
    ORDER BY s.updatedAt DESC
    LIMIT ? OFFSET ?
  `).all(like, like, like, limit, offset);
  rows.forEach(r => { r.payable = Number(r.payable || 0); });
  return rows;
}

function getById(id) {
  const db = getDb();
  const s = db.prepare(`
    SELECT s.*,
      (SELECT IFNULL(SUM(
        (SELECT IFNULL(SUM(poi.qty * poi.cost), 0) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) - po.paid), 0)
        FROM purchase_orders po WHERE po.supplierId = s.id AND po.status = 'RECEIVED') AS payable
    FROM suppliers s WHERE s.id = ?
  `).get(id);
  if (s) s.payable = Number(s.payable || 0);
  return s;
}

function listPayments(supplierId) {
  const db = getDb();
  return db.prepare(`
    SELECT sp.*, u.name AS userName
    FROM supplier_payments sp LEFT JOIN users u ON u.id = sp.userId
    WHERE sp.supplierId = ?
    ORDER BY sp.createdAt DESC, sp.id DESC
  `).all(supplierId);
}

function recordPayment({ supplierId, amount, note = '', userId = null }) {
  const db = getDb();
  const now = new Date().toISOString();
  if (!(Number(amount) > 0)) throw new Error('Invalid payment amount');
  return db.transaction(() => {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const outstandingRow = db.prepare(`
      SELECT IFNULL(SUM(
        (SELECT IFNULL(SUM(poi.qty * poi.cost), 0) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) - po.paid), 0) AS total
      FROM purchase_orders po WHERE po.supplierId = ? AND po.status = ?
    `).get(supplierId, 'RECEIVED');
    const payable = Number(outstandingRow?.total || 0);
    const paid = Number(amount);
    if (paid > payable + 1e-9) throw new Error(`Payment exceeds outstanding (${payable.toFixed(2)})`);

    // Apply to oldest unpaid RECEIVED PO first
    const pos = db.prepare(`
      SELECT id, grandTotal, paid FROM purchase_orders
      WHERE supplierId = ? AND status = 'RECEIVED' AND paid < grandTotal
      ORDER BY createdAt ASC, id ASC
    `).all(supplierId);

    let remaining = paid;
    const apply = db.prepare('UPDATE purchase_orders SET paid = ? WHERE id = ?');
    for (const po of pos) {
      if (remaining <= 0) break;
      const owed = Number(po.grandTotal) - Number(po.paid);
      const take = Math.min(owed, remaining);
      apply.run(Number(po.paid) + take, po.id);
      remaining -= take;
    }

    const info = db.prepare(`
      INSERT INTO supplier_payments (supplierId, amount, note, userId, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(supplierId, paid, note || null, userId, now);
    return { ok: true, id: info.lastInsertRowid, amount: paid, applied: paid - remaining };
  })();
}

function create(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO suppliers (name, phone, email, address, notes, createdAt, updatedAt)
    VALUES (@name, @phone, @email, @address, @notes, @createdAt, @updatedAt)
  `).run(normalize(data, now));
  return getById(info.lastInsertRowid);
}

function update(id, data) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE suppliers SET
      name=@name, phone=@phone, email=@email, address=@address, notes=@notes, updatedAt=@updatedAt
    WHERE id=@id
  `).run({ ...normalize(data, now), id });
  return getById(id);
}

function normalize(data, now) {
  return {
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    notes: data.notes || null,
    createdAt: now,
    updatedAt: now,
  };
}

function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  return true;
}

module.exports = { list, getById, create, update, remove, listPayments, recordPayment };
