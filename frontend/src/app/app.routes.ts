import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'staff/login', pathMatch: 'full' },

  {
    path: 'menu/:slug/table/:token',
    loadComponent: () =>
      import('./features/customer-menu/menu-shell/menu-shell.component').then(
        (m) => m.MenuShellComponent,
      ),
  },
  {
    path: 'menu/:slug',
    loadComponent: () =>
      import('./features/customer-menu/menu-shell/menu-shell.component').then(
        (m) => m.MenuShellComponent,
      ),
  },
  {
    path: 'orders/:token/result',
    loadComponent: () =>
      import('./features/customer-menu/payment-result/payment-result.component').then(
        (m) => m.PaymentResultComponent,
      ),
  },
  {
    path: 'orders/:token',
    loadComponent: () =>
      import('./features/customer-menu/order-tracking/order-tracking.component').then(
        (m) => m.OrderTrackingComponent,
      ),
  },

  {
    path: 'staff/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-shell/dashboard-shell.component').then(
        (m) => m.DashboardShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'select' },
      {
        path: 'select',
        loadComponent: () =>
          import('./features/dashboard/restaurant-select/restaurant-select.component').then(
            (m) => m.RestaurantSelectComponent,
          ),
      },
      {
        path: ':restaurantSlug/orders',
        loadComponent: () =>
          import('./features/dashboard/orders/orders.component').then(
            (m) => m.DashboardOrdersComponent,
          ),
      },
      {
        path: ':restaurantSlug/menu',
        loadComponent: () =>
          import('./features/dashboard/menu/menu.component').then((m) => m.DashboardMenuComponent),
      },
      {
        path: ':restaurantSlug/categories',
        loadComponent: () =>
          import('./features/dashboard/categories/categories.component').then(
            (m) => m.DashboardCategoriesComponent,
          ),
      },
      {
        path: ':restaurantSlug/tables',
        loadComponent: () =>
          import('./features/dashboard/tables/tables.component').then(
            (m) => m.DashboardTablesComponent,
          ),
      },
      {
        path: ':restaurantSlug/staff',
        loadComponent: () =>
          import('./features/dashboard/staff/staff.component').then(
            (m) => m.DashboardStaffComponent,
          ),
      },
      {
        path: ':restaurantSlug/settings',
        loadComponent: () =>
          import('./features/dashboard/settings/settings.component').then(
            (m) => m.DashboardSettingsComponent,
          ),
      },
    ],
  },

  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
