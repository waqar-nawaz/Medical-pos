const router = require('express').Router();
const Ctrl   = require('../controllers/customers.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/',              auth(true), requirePermission('customers'), Ctrl.list);
router.get('/:id/ledger',   auth(true), requirePermission('customers'), Ctrl.getLedger);   // NEW: balance ledger
router.get('/:id',          auth(true), requirePermission('customers'), Ctrl.get);
router.post('/',            auth(true), requirePermission('customers'), Ctrl.create);
router.put('/:id',          auth(true), requirePermission('customers'), Ctrl.update);
router.delete('/:id',       auth(true), requirePermission('customers'), Ctrl.remove);

module.exports = router;
