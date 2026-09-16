const router = require('express').Router();
const Ctrl = require('../controllers/settings.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('settings'), Ctrl.get);
router.put('/', auth(true), requirePermission('settings'), Ctrl.update);

module.exports = router;
