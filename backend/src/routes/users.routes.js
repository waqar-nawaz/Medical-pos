const router = require('express').Router();
const Ctrl = require('../controllers/users.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requireRole('admin'), Ctrl.list);
router.post('/', auth(true), requireRole('admin'), Ctrl.create);
router.put('/:id', auth(true), requireRole('admin'), Ctrl.update);
router.post('/:id/reset-password', auth(true), requireRole('admin'), Ctrl.resetPassword);
router.delete('/:id', auth(true), requireRole('admin'), Ctrl.remove);

module.exports = router;