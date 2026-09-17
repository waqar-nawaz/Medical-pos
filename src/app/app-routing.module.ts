import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule),
  },

  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', canActivate: [permissionGuard('dashboard')], loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'pos', canActivate: [permissionGuard('pos')], loadChildren: () => import('./modules/pos/pos.module').then(m => m.PosModule) },
      { path: 'products', canActivate: [permissionGuard('products')], loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule) },
      { path: 'sales', canActivate: [permissionGuard('sales')], loadChildren: () => import('./modules/sales/sales.module').then(m => m.SalesModule) },
      { path: 'suppliers', canActivate: [permissionGuard('suppliers')], loadChildren: () => import('./modules/suppliers/suppliers.module').then(m => m.SuppliersModule) },
      { path: 'customers', canActivate: [permissionGuard('customers')], loadChildren: () => import('./modules/customers/customers.module').then(m => m.CustomersModule) },
      { path: 'reports', canActivate: [permissionGuard('reports')], loadChildren: () => import('./modules/reports/reports.module').then(m => m.ReportsModule) },
      { path: 'returns', canActivate: [permissionGuard('sales')], loadChildren: () => import('./modules/returns/returns.module').then(m => m.ReturnsModule) },
      { path: 'purchase-orders', canActivate: [permissionGuard('purchase-orders')], loadChildren: () => import('./modules/purchase-orders/purchase-orders.module').then(m => m.PurchaseOrdersModule) },
      { path: 'settings', canActivate: [permissionGuard('settings')], loadChildren: () => import('./modules/settings/settings.module').then(m => m.SettingsModule) },
      { path: 'users', canActivate: [permissionGuard('users')], loadChildren: () => import('./modules/users/users.module').then(m => m.UsersModule) },
    ],
  },

  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true, scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
