const router = require('express').Router();
const Ctrl = require('../controllers/dashboard.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/stats', auth(true), requirePermission('dashboard'), Ctrl.stats);
router.get('/top-products', auth(true), requirePermission('dashboard'), Ctrl.topProducts);

module.exports = router;
