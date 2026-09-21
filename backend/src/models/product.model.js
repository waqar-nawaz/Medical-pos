const { getDb } = require('../config/db');

function listBatchesForProductIds(db, ids) {
  if (!ids.length) return [];
  const marks = ids.map(() => '?').join(',');
  return db.prepare(`
    SELECT * FROM product_batches
    WHERE productId IN (${marks})
    ORDER BY expiryDate ASC, id ASC
  `).all(...ids);
}

function list({ q = '', category = '', limit = 50, offset = 0 }) {
  const db = getDb();
  const like = `%${q}%`;
  const cat  = String(category || '');
  const rows = db.prepare(`
    SELECT p.*, s.name AS supplierName
    FROM products p LEFT JOIN suppliers s ON s.id = p.supplierId
    WHERE (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)
      AND (? = '' OR p.category = ?)
    ORDER BY p.updatedAt DESC LIMIT ? OFFSET ?
  `).all(like, like, like, cat, cat, limit, offset);

  const tracked = rows.filter(r => r.trackBatches === 1);
  if (tracked.length) {
    const batches = listBatchesForProductIds(db, tracked.map(r => r.id));
    for (const r of tracked) {
      r.batches = batches.filter(b => b.productId === r.id);
      r.batchStock = r.batches.reduce((s, b) => s + Number(b.stockQty || 0), 0);
    }
  }
  return rows;
}

function getById(id) {
  return getDb().prepare('SELECT * FROM products WHERE id=?').get(id);
}

function getByBarcode(barcode) {
  return getDb().prepare('SELECT * FROM products WHERE barcode=?').get(barcode);
}

// Build dynamic INSERT / UPDATE that is safe whether migration has run or not
function create(data) {
  const db  = getDb();
  const now = new Date().toISOString();
  const cols = db.prepare("PRAGMA table_info('products')").all().map(r => r.name);

  const base = { name:data.name, sku:data.sku||null, barcode:data.barcode||null,
    category:data.category||null, batchNo:data.batchNo||null, unit:data.unit||'pcs',
    price:data.price||0, cost:data.cost||0, gstRate:data.gstRate||0,
    stockQty:data.stockQty||0, reorderLevel:data.reorderLevel||0,
    expiryDate:data.expiryDate||null, supplierId:data.supplierId||null,
    isActive:data.isActive??1, shelf:data.shelf||null, createdAt:now, updatedAt:now };

  if (cols.includes('productDiscount')) base.productDiscount = Number(data.productDiscount||0);
  if (cols.includes('unitsPerStrip'))   base.unitsPerStrip   = Number(data.unitsPerStrip||1);
  if (cols.includes('stripsPerBox'))    base.stripsPerBox    = Number(data.stripsPerBox||1);
  if (cols.includes('packagingUnit'))   base.packagingUnit   = data.packagingUnit||'unit';
  if (cols.includes('trackBatches'))    base.trackBatches    = data.trackBatches ? 1 : 0;

  const fields = Object.keys(base);
  const info   = db.prepare(
    `INSERT INTO products (${fields.join(',')}) VALUES (${fields.map(f=>'@'+f).join(',')})`
  ).run(base);
  return getById(info.lastInsertRowid);
}

function update(id, data) {
  const db  = getDb();
  const now = new Date().toISOString();
  const cols = db.prepare("PRAGMA table_info('products')").all().map(r => r.name);

  const base = { name:data.name, sku:data.sku||null, barcode:data.barcode||null,
    category:data.category||null, batchNo:data.batchNo||null, unit:data.unit||'pcs',
    price:data.price||0, cost:data.cost||0, gstRate:data.gstRate||0,
    stockQty:data.stockQty||0, reorderLevel:data.reorderLevel||0,
    expiryDate:data.expiryDate||null, supplierId:data.supplierId||null,
    isActive:data.isActive??1, shelf:data.shelf||null, updatedAt:now, id };

  if (cols.includes('productDiscount')) base.productDiscount = Number(data.productDiscount||0);
  if (cols.includes('unitsPerStrip'))   base.unitsPerStrip   = Number(data.unitsPerStrip||1);
  if (cols.includes('stripsPerBox'))    base.stripsPerBox    = Number(data.stripsPerBox||1);
  if (cols.includes('packagingUnit'))   base.packagingUnit   = data.packagingUnit||'unit';
  if (cols.includes('trackBatches'))    base.trackBatches    = data.trackBatches ? 1 : 0;

  const sets = Object.keys(base).filter(k => k !== 'id').map(k => `${k}=@${k}`).join(',');
  db.prepare(`UPDATE products SET ${sets} WHERE id=@id`).run(base);
  return getById(id);
}

function updateStock(id, stockQty) {
  getDb().prepare('UPDATE products SET stockQty=?,updatedAt=? WHERE id=?').run(stockQty, new Date().toISOString(), id);
  return getById(id);
}

function listBatches(productId) {
  return getDb().prepare(`
    SELECT * FROM product_batches WHERE productId = ?
    ORDER BY expiryDate ASC, id ASC
  `).all(productId);
}

function addBatch({ productId, batchNo, expiryDate = null, qty, cost = 0 }) {
  const db = getDb();
  if (!productId || !(Number(qty) > 0)) throw new Error('Invalid batch quantity');
  const now = new Date().toISOString();
  return db.transaction(() => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) throw new Error('Product not found');
    const info = db.prepare(`
      INSERT INTO product_batches (productId, batchNo, expiryDate, stockQty, cost, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(productId, batchNo || null, expiryDate || null, Number(qty), Number(cost || 0), now, now);
    db.prepare('UPDATE products SET stockQty = stockQty + ?, updatedAt = ?, batchNo = COALESCE(?, batchNo), expiryDate = COALESCE(?, expiryDate) WHERE id = ?')
      .run(Number(qty), now, batchNo || null, expiryDate || null, productId);
    return db.prepare('SELECT * FROM product_batches WHERE id = ?').get(info.lastInsertRowid);
  })();
}

function remove(id) {
  getDb().prepare('DELETE FROM products WHERE id=?').run(id);
  return true;
}

module.exports = { list, getById, getByBarcode, create, update, updateStock, remove, listBatches, addBatch };
