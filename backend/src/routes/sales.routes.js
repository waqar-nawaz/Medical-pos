const router = require('express').Router();
const Ctrl   = require('../controllers/sales.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/',                              auth(true), requirePermission('sales'), Ctrl.list);
router.get('/:id',                           auth(true), requirePermission('sales'), Ctrl.get);
router.post('/',                             auth(true), requirePermission('sales'), Ctrl.create);
router.put('/:id',                           auth(true), requirePermission('sales'), Ctrl.edit);          // NEW: edit bill
router.get('/ledger/:customerId',            auth(true), requirePermission('sales'), Ctrl.getLedger);     // NEW: customer ledger
router.post('/payment/:customerId',          auth(true), requirePermission('sales'), Ctrl.recordPayment); // NEW: record payment

module.exports = router;
