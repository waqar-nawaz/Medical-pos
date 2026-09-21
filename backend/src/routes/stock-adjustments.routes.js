const router = require('express').Router();
const Ctrl = require('../controllers/stockAdjustments.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('products'), Ctrl.list);

module.exports = router;