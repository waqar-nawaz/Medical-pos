const { getDb } = require('../config/db');

function periodWhere(column, from, to) {
  const params = [];
  let where = '';
  if (from && to) {
    where = `WHERE ${column} BETWEEN ? AND ?`;
    params.push(from, to);
  }
  return { where, params };
}

function summary({ from, to }) {
  const db = getDb();
  const { where, params } = periodWhere('createdAt', from, to);
  const sales = db.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(grandTotal),0) AS revenue FROM sales ${where}`).get(...params);
  const lowStock = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE isActive=1 AND stockQty <= reorderLevel`).get();
  const expiring = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE isActive=1 AND expiryDate IS NOT NULL AND date(expiryDate) <= date('now','+30 day')`).get();
  const outOfStock = db.prepare(`
  SELECT COUNT(*) AS count
  FROM products
  WHERE isActive = 1 AND stockQty = 0
`).get();
  const activeProducts = db.prepare(`
  SELECT COUNT(*) AS count
  FROM products
  WHERE isActive = 1
`).get();
  const expWhere = periodWhere('date', from, to);
  const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM expenses ${expWhere.where}`).get(...expWhere.params);
  return {
    sales,
    lowStock,
    expiring,
    outOfStock,
    activeProducts,
    expenses: { total: Number(expenses.total) || 0, count: expenses.count },
  };
}

// Simple profit & loss for a date range
// Gross sales = sum of grand total; COGS = qty sold x product cost;
// Net profit = gross profit - operating expenses in the period.
function pnl({ from, to }) {
  const db = getDb();

  const { where: sw, params: sp } = periodWhere('s.createdAt', from, to);
  const salesRow = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(s.grandTotal),0) AS grossSales,
           COALESCE(SUM(s.gstTotal),0) AS gstTotal
    FROM sales s ${sw}
  `).get(...sp);

  const cogsRow = db.prepare(`
    SELECT COALESCE(SUM(si.qty * p.cost),0) AS cogs
    FROM sale_items si
    JOIN sales s ON s.id = si.saleId
    JOIN products p ON p.id = si.productId
    ${sw}
  `).get(...sp);

  const { where: ew, params: ep } = periodWhere('date', from, to);
  const expRow = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses ${ew}`).get(...ep);

  const grossSales = Number(salesRow.grossSales) || 0;
  const cogs = Number(cogsRow.cogs) || 0;
  const expenses = Number(expRow.total) || 0;
  return {
    salesCount: salesRow.count,
    grossSales,
    gstCollected: Number(salesRow.gstTotal) || 0,
    netSales: grossSales - (Number(salesRow.gstTotal) || 0),
    cogs,
    grossProfit: grossSales - cogs,
    expenses,
    netProfit: grossSales - cogs - expenses,
  };
}

function topProducts({ limit = 10 }) {
  const db = getDb();
  return db.prepare(`
    SELECT p.id, p.name, SUM(si.qty) AS qtySold
    FROM sale_items si
    JOIN products p ON p.id = si.productId
    GROUP BY p.id
    ORDER BY qtySold DESC
    LIMIT ?
  `).all(limit);
}

function gstReport({ from, to }) {
  const db = getDb();
  const params = [];
  let where = '';
  if (from && to) {
    where = 'WHERE s.createdAt BETWEEN ? AND ?';
    params.push(from, to);
  }
  return db.prepare(`
    SELECT date(s.createdAt) AS day, COALESCE(SUM(s.gstTotal),0) AS gstCollected, COALESCE(SUM(s.subTotal),0) AS taxableValue
    FROM sales s
    ${where}
    GROUP BY date(s.createdAt)
    ORDER BY day ASC
  `).all(...params);
}

// Additional report placeholders (return consistent shapes so UI works)
function emptyList() { return []; }

function lowStockReport() {
  const db = getDb();
  return db.prepare(`
    SELECT p.id, p.name, p.stockQty, p.reorderLevel, p.unit, p.shelf,
           p.supplierId, s.name AS supplierName,
           CASE WHEN p.stockQty <= 0 THEN 'Out of Stock' ELSE 'Low Stock' END AS status
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplierId
    WHERE p.isActive = 1 AND p.stockQty <= p.reorderLevel
    ORDER BY p.stockQty ASC
  `).all();
}

function expiryReport({ days = 90 } = {}) {
  const db = getDb();
  return db.prepare(`
    SELECT p.id, p.name, p.batchNo, p.stockQty, p.expiryDate, p.shelf,
           julianday(p.expiryDate) - julianday(date('now')) AS daysLeft
    FROM products p
    WHERE p.isActive = 1 AND p.expiryDate IS NOT NULL
      AND date(p.expiryDate) <= date('now', '+${Number(days)} day')
    ORDER BY p.expiryDate ASC
  `).all();
}

function profitReport({ from, to }) {
  return pnl({ from, to });
}

module.exports = {
  summary,
  topProducts,
  gstReport,
  pnl,
  lowStockReport,
  expiryReport,
  profitReport,
  // placeholders for the 15+ report types mentioned in the spec
  inventoryValuation: emptyList,
  salesByDay: emptyList,
  salesByCashier: emptyList,
  customerLoyaltyReport: emptyList,
  returnsReport: emptyList,
  purchaseOrdersReport: emptyList,
  gstGstr1: emptyList,
  gstGstr3b: emptyList,
  supplierLedger: emptyList,
  stockMovementReport: emptyList,
};
