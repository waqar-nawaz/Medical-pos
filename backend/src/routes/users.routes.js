const router = require('express').Router();
const Ctrl = require('../controllers/users.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

// User management is gated by the 'users' permission (admins always pass).
router.get('/', auth(true), requirePermission('users'), Ctrl.list);
router.post('/', auth(true), requirePermission('users'), Ctrl.create);
router.put('/:id', auth(true), requirePermission('users'), Ctrl.update);
router.post('/:id/reset-password', auth(true), requirePermission('users'), Ctrl.resetPassword);
router.delete('/:id', auth(true), requirePermission('users'), Ctrl.remove);

module.exports = router;