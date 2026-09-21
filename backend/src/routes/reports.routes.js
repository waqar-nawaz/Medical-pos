const router = require('express').Router();
const Ctrl = require('../controllers/reports.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/summary', auth(true), requirePermission('reports'), Ctrl.summary);
router.get('/top-products', auth(true), requirePermission('reports'), Ctrl.topProducts);
router.get('/gst', auth(true), requirePermission('reports'), Ctrl.gst);
router.get('/pnl', auth(true), requirePermission('reports'), Ctrl.pnl);

// 15+ endpoints (placeholders included)
router.get('/inventory-valuation', auth(true), requirePermission('reports'), Ctrl.inventoryValuation);
router.get('/sales-by-day', auth(true), requirePermission('reports'), Ctrl.salesByDay);
router.get('/sales-by-cashier', auth(true), requirePermission('reports'), Ctrl.salesByCashier);
router.get('/profit', auth(true), requirePermission('reports'), Ctrl.profitReport);
router.get('/low-stock', auth(true), requirePermission('reports'), Ctrl.lowStockReport);
router.get('/expiry', auth(true), requirePermission('reports'), Ctrl.expiryReport);
router.get('/customer-loyalty', auth(true), requirePermission('reports'), Ctrl.customerLoyaltyReport);
router.get('/returns', auth(true), requirePermission('reports'), Ctrl.returnsReport);
router.get('/purchase-orders', auth(true), requirePermission('reports'), Ctrl.purchaseOrdersReport);
router.get('/gstr1', auth(true), requirePermission('reports'), Ctrl.gstGstr1);
router.get('/gstr3b', auth(true), requirePermission('reports'), Ctrl.gstGstr3b);
router.get('/supplier-ledger', auth(true), requirePermission('reports'), Ctrl.supplierLedger);
router.get('/stock-movement', auth(true), requirePermission('reports'), Ctrl.stockMovementReport);

module.exports = router;
