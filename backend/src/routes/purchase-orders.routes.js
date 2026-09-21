const router = require('express').Router();
const Ctrl = require('../controllers/purchase-orders.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('purchase-orders'), Ctrl.list);
router.get('/suggest', auth(true), requirePermission('purchase-orders'), Ctrl.suggest);
router.get('/:id', auth(true), requirePermission('purchase-orders'), Ctrl.get);
router.post('/', auth(true), requirePermission('purchase-orders'), Ctrl.create);
router.post('/:id/receive', auth(true), requirePermission('purchase-orders'), Ctrl.receive);

module.exports = router;
