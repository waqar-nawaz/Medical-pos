const router = require('express').Router();
const Ctrl = require('../controllers/settings.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('settings'), Ctrl.get);
router.put('/', auth(true), requirePermission('settings'), Ctrl.update);
router.get('/backup', auth(true), requirePermission('settings'), Ctrl.backup);

module.exports = router;
