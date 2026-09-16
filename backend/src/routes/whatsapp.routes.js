const router = require('express').Router();
const Ctrl = require('../controllers/whatsapp.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.post('/invoice-link', auth(true), requirePermission('sales'), Ctrl.invoiceLink);

module.exports = router;
