const { getDb } = require('../config/db');

function list({ limit = 50, offset = 0 }) {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, s.invoiceNo
    FROM returns r
    JOIN sales s ON s.id = r.saleId
    ORDER BY r.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function create({ userId, saleId, reason = '', items = [] }) {
  const db = getDb();
  const now = new Date().toISOString();

  const hasBalance   = !!db.prepare("PRAGMA table_info('customers')").all().map(r => r.name).includes('balance');
  const hasLedgerCol = !!db.prepare("PRAGMA table_info('customer_ledger')").all().map(r => r.name).includes('credit');
  const hasPaidCol   = !!db.prepare("PRAGMA table_info('sales')").all().map(r => r.name).includes('amountPaid');
  const hasBatchCol  = !!db.prepare("PRAGMA table_info('sale_items')").all().map(r => r.name).includes('batchId');

  return db.transaction(() => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    if (!sale) throw new Error('Sale not found');

    let refundTotal = 0;

    const retInfo = db.prepare(`
      INSERT INTO returns (saleId, userId, reason, refundTotal, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(saleId, userId, reason, now);

    const returnId = retInfo.lastInsertRowid;

    const itemStmt = db.prepare(`
      INSERT INTO return_items (returnId, productId, qty, refundAmount)
      VALUES (?, ?, ?, ?)
    `);
    const stockStmt = db.prepare('UPDATE products SET stockQty = stockQty + ?, updatedAt = ? WHERE id = ?');
    const batchStmt = hasBatchCol
      ? db.prepare('UPDATE product_batches SET stockQty = stockQty + ?, updatedAt = ? WHERE id = ?')
      : null;

    for (const it of items) {
      const qty = Number(it.qty || 0);
      if (qty <= 0) continue;
      const saleItem = db.prepare('SELECT * FROM sale_items WHERE saleId = ? AND productId = ?').get(saleId, it.productId);
      if (!saleItem) throw new Error('Invalid return item');
      const maxQty = saleItem.qty;
      if (qty > maxQty) throw new Error('Return qty exceeds sold qty');

      const refund = (saleItem.lineTotal / saleItem.qty) * qty;
      refundTotal += refund;

      itemStmt.run(returnId, it.productId, qty, refund);
      stockStmt.run(qty, now, it.productId);
      if (batchStmt && saleItem.batchId) {
        batchStmt.run(qty, now, saleItem.batchId);
      }
    }

    db.prepare('UPDATE returns SET refundTotal = ? WHERE id = ?').run(refundTotal, returnId);

    // Credit settlement — reduce customer balance + ledger + sale amountPaid
    if (refundTotal > 0 && sale.customerId && hasBalance && hasLedgerCol) {
      const cust = db.prepare('SELECT balance FROM customers WHERE id = ?').get(sale.customerId);
      if (cust) {
        const newBal = Math.max(0, Number(cust.balance || 0) - refundTotal);
        db.prepare('UPDATE customers SET balance = ?, updatedAt = ? WHERE id = ?').run(newBal, now, sale.customerId);
        db.prepare('INSERT INTO customer_ledger (customerId,billId,type,debit,credit,balance,note,createdAt) VALUES (?,?,?,?,?,?,?,?)')
          .run(sale.customerId, saleId, 'RETURN', 0, Math.round(refundTotal * 100) / 100, newBal, reason || 'Return', now);
        if (hasPaidCol) {
          const newPaid = Math.max(0, Number(sale.amountPaid || 0) - refundTotal);
          db.prepare('UPDATE sales SET amountPaid = ?, balanceDue = ?, updatedAt = ? WHERE id = ?')
            .run(newPaid, Math.max(0, sale.grandTotal - newPaid), now, saleId);
        }
      }
    }

    return db.prepare('SELECT * FROM returns WHERE id = ?').get(returnId);
  })();
}

module.exports = { list, create };
