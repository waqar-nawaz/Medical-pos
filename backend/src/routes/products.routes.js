const router = require('express').Router();
const Ctrl = require('../controllers/products.controller');
const SAdj = require('../controllers/stockAdjustments.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('products'), Ctrl.list);
router.get('/scan/:barcode', auth(true), requirePermission('products'), Ctrl.scan);
router.get('/:id', auth(true), requirePermission('products'), Ctrl.get);
router.post('/', auth(true), requirePermission('products'), Ctrl.create);
router.put('/:id', auth(true), requirePermission('products'), Ctrl.update);
router.patch('/:id/stock', auth(true), requirePermission('products'), Ctrl.updateStock);
router.post('/:id/adjust-stock', auth(true), requirePermission('products'), SAdj.adjustProduct);
router.delete('/:id', auth(true), requirePermission('products'), Ctrl.remove);

module.exports = router;
