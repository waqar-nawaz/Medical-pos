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

  const userCols = db.prepare("PRAGMA table_info('users')").all().map(r => r.name);
  if (!userCols.includes('permissions')) {
    db.exec("ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '[]'");
    console.log('  + users.permissions');
  }

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