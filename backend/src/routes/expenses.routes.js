const router = require('express').Router();
const Ctrl = require('../controllers/expenses.controller');
const { auth, requirePermission } = require('../middlewares/auth.middleware');

router.get('/', auth(true), requirePermission('reports'), Ctrl.list);
router.get('/summary', auth(true), requirePermission('reports'), Ctrl.summary);
router.post('/', auth(true), requirePermission('reports'), Ctrl.create);
router.put('/:id', auth(true), requirePermission('reports'), Ctrl.update);
router.delete('/:id', auth(true), requirePermission('reports'), Ctrl.remove);

module.exports = router;