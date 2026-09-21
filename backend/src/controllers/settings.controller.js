const path = require('path');
const { z } = require('zod');
const { config } = require('../config/env');
const { copyDb } = require('../services/backup.service');
const Settings = require('../models/settings.model');

const schema = z.object({
  storeName: z.string().min(2).default('Medical POS'),
  storePhone: z.string().optional().nullable(),
  storeAddress: z.string().optional().nullable(),
  receiptFooter: z.string().optional().nullable(),
  brandColor: z.string().default('#4f46e5'),
  logoDataUrl: z.string().optional().nullable(),
  gstEnabled: z.boolean().default(true),
});

function get(req, res) {
  res.json({ ok: true, data: Settings.get() });
}

function update(req, res) {
  const data = schema.parse(req.body);
  res.json({ ok: true, data: Settings.upsert(data) });
}

function backup(req, res) {
  const dest = copyDb(config.dbPath, path.join(config.backupDir, 'manual'));
  res.download(dest, `medical_pos_backup_${Date.now()}.sqlite`);
}

module.exports = { get, update, backup };
