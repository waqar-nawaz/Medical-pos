/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

function provisionDatabase() {
  const db = getDb();

  const schemaPath = path.resolve(process.cwd(), 'backend', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // Idempotent column/table migrations so existing databases get new fields.
  const addCol = (table, name, def) => {
    const cols = db.prepare(`PRAGMA table_info('${table}')`).all().map(r => r.name);
    if (!cols.includes(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def};`);
      console.log(`  + ${table}.${name}`);
    }
  };

  addCol('users',    'permissions', "TEXT NOT NULL DEFAULT '[]'");
  addCol('customers','balance',     'REAL NOT NULL DEFAULT 0');
  addCol('customers','notes',       'TEXT');
  addCol('products', 'productDiscount', 'REAL NOT NULL DEFAULT 0');
  addCol('products', 'unitsPerStrip',   'INTEGER NOT NULL DEFAULT 1');
  addCol('products', 'stripsPerBox',    'INTEGER NOT NULL DEFAULT 1');
  addCol('products', 'packagingUnit',   "TEXT NOT NULL DEFAULT 'unit'");
  addCol('sales',    'amountPaid',  'REAL NOT NULL DEFAULT 0');
  addCol('sales',    'balanceDue',  'REAL NOT NULL DEFAULT 0');
  addCol('sales',    'billDiscount','REAL NOT NULL DEFAULT 0');
  addCol('sales',    'prevBalance', 'REAL NOT NULL DEFAULT 0');
  addCol('sales',    'payments',    "TEXT NOT NULL DEFAULT '[]'");
  addCol('sale_items','productDiscount','REAL NOT NULL DEFAULT 0');
  addCol('sale_items','discountAmount', 'REAL NOT NULL DEFAULT 0');
  addCol('sale_items','packagingUnit',  "TEXT NOT NULL DEFAULT 'unit'");
  addCol('sale_items','batchId',        'INTEGER');
  addCol('products', 'trackBatches', 'INTEGER NOT NULL DEFAULT 0');
  addCol('purchase_orders', 'paid',  'REAL NOT NULL DEFAULT 0');
  addCol('purchase_orders', 'grandTotal', 'REAL NOT NULL DEFAULT 0');

  // New tables for batch tracking and supplier payables (idempotent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      batchNo TEXT,
      expiryDate TEXT,
      stockQty INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(productId);
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplierId INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      userId INTEGER,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplierId);
  `);
  addCol('supplier_payments', 'userId', 'INTEGER');

  const now = new Date().toISOString();

  const settings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!settings) {
    db.prepare(`
      INSERT INTO settings (id, storeName, storePhone, storeAddress, receiptFooter, brandColor, logoDataUrl, gstEnabled, createdAt, updatedAt)
      VALUES (1, 'Medical POS', '', '', 'Thank you for your purchase.', '#4f46e5', NULL, 1, ?, ?)
    `).run(now, now);
  }

  const adminEmail = 'admin@local';
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!user) {
    const passwordHash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (email, name, role, passwordHash, createdAt, updatedAt)
      VALUES (?, 'Administrator', 'admin', ?, ?, ?)
    `).run(adminEmail, passwordHash, now, now);
  }

  console.log('✅ Database provisioned (schema + defaults)');
}

module.exports = { provisionDatabase };