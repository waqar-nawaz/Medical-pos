const PERMISSIONS = [
  'dashboard',
  'pos',
  'products',
  'sales',
  'suppliers',
  'customers',
  'purchase-orders',
  'reports',
  'settings',
  'users',
];

// A new cashier should be able to open the dashboard and create bills.
// The POS screen can still read products/customers/settings through the
// read-only fallback in the permission middleware.
const DEFAULT_CASHIER_PERMISSIONS = ['dashboard', 'pos'];

function defaultPermissions(role) {
  return role === 'admin' ? [...PERMISSIONS] : [...DEFAULT_CASHIER_PERMISSIONS];
}

module.exports = { PERMISSIONS, DEFAULT_CASHIER_PERMISSIONS, defaultPermissions };
