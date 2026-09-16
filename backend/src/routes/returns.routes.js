const router = require('express').Router();
const Ctrl = require('../controllers/returns.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('sales'), Ctrl.list);
router.post('/', auth(true), requirePermission('sales'), Ctrl.create);

module.exports = router;
