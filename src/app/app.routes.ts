import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        title: 'Fleet Dashboard — VitalsDrive',
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./pages/fleet-map/fleet-map.component').then(
            (m) => m.FleetMapComponent,
          ),
        title: 'Fleet Map — VitalsDrive',
      },
      {
        path: 'vehicle/:id',
        loadComponent: () =>
          import('./pages/vehicle-detail/vehicle-detail.component').then(
            (m) => m.VehicleDetailComponent,
          ),
        title: 'Vehicle Details — VitalsDrive',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./pages/alerts/alerts.component').then(
            (m) => m.AlertsComponent,
          ),
        title: 'Active Alerts — VitalsDrive',
      },
      {
        path: 'backoffice',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            redirectTo: 'fleets',
            pathMatch: 'full',
          },
          {
            path: 'fleets',
            loadComponent: () =>
              import('./pages/backoffice/fleet-list/fleet-list.component').then(
                (m) => m.FleetListComponent,
              ),
            title: 'Manage Fleets — VitalsDrive',
          },
          {
            path: 'fleets/:id',
            loadComponent: () =>
              import('./pages/backoffice/fleet-detail/fleet-detail.component').then(
                (m) => m.FleetDetailComponent,
              ),
            title: 'Fleet Details — VitalsDrive',
          },
          {
            path: 'vehicles',
            loadComponent: () =>
              import('./pages/backoffice/vehicle-list/vehicle-list.component').then(
                (m) => m.VehicleListComponent,
              ),
            title: 'Manage Vehicles — VitalsDrive',
          },
          {
            path: 'vehicles/:id',
            loadComponent: () =>
              import('./pages/backoffice/vehicle-edit/vehicle-edit.component').then(
                (m) => m.VehicleEditComponent,
              ),
            title: 'Edit Vehicle — VitalsDrive',
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./pages/backoffice/user-management/user-management.component').then(
                (m) => m.UserManagementComponent,
              ),
            title: 'User Management — VitalsDrive',
          },
        ],
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
    title: 'Login — VitalsDrive',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
