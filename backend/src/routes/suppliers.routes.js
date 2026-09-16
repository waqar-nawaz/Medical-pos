const router = require('express').Router();
const Ctrl = require('../controllers/suppliers.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('suppliers'), Ctrl.list);
router.get('/:id', auth(true), requirePermission('suppliers'), Ctrl.get);
router.post('/', auth(true), requirePermission('suppliers'), Ctrl.create);
router.put('/:id', auth(true), requirePermission('suppliers'), Ctrl.update);
router.delete('/:id', auth(true), requirePermission('suppliers'), Ctrl.remove);

module.exports = router;
