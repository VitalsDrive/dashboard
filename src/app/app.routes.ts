import { Routes } from '@angular/router';
import { authGuard, authGuardChild, allowlistGuard, onboardingGuard, onboardingStepGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(
        (m) => m.LoginComponent,
      ),
    title: 'Login — VitalsDrive',
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.component').then(
        (m) => m.SignupComponent,
      ),
    title: 'Sign Up — VitalsDrive',
  },
  {
    path: 'pending',
    loadComponent: () =>
      import('./pages/pending/pending.component').then(
        (m) => m.PendingComponent,
      ),
    title: 'Account Pending — VitalsDrive',
  },

  // Protected routes
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuardChild],
    children: [
      {
        path: 'onboarding',
        canActivate: [authGuard, onboardingStepGuard],
        children: [
          {
            path: '',
            redirectTo: 'organization',
            pathMatch: 'full',
          },
          {
            path: 'organization',
            loadComponent: () =>
              import('./pages/onboarding/organization/onboarding-organization.component').then(
                (m) => m.OnboardingOrganizationComponent,
              ),
            title: 'Create Organization — VitalsDrive',
          },
          {
            path: 'fleet',
            loadComponent: () =>
              import('./pages/onboarding/fleet/onboarding-fleet.component').then(
                (m) => m.OnboardingFleetComponent,
              ),
            title: 'Create Fleet — VitalsDrive',
          },
          {
            path: 'complete',
            loadComponent: () =>
              import('./pages/onboarding/complete/onboarding-complete.component').then(
                (m) => m.OnboardingCompleteComponent,
              ),
            title: 'Setup Complete — VitalsDrive',
          },
        ],
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        canActivate: [allowlistGuard, onboardingGuard],
        title: 'Fleet Dashboard — VitalsDrive',
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./pages/fleet-map/fleet-map.component').then(
            (m) => m.FleetMapComponent,
          ),
        canActivate: [allowlistGuard, onboardingGuard],
        title: 'Fleet Map — VitalsDrive',
      },
      {
        path: 'vehicle/:id',
        loadComponent: () =>
          import('./pages/vehicle-detail/vehicle-detail.component').then(
            (m) => m.VehicleDetailComponent,
          ),
        canActivate: [allowlistGuard, onboardingGuard],
        title: 'Vehicle Details — VitalsDrive',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./pages/alerts/alerts.component').then(
            (m) => m.AlertsComponent,
          ),
        canActivate: [allowlistGuard, onboardingGuard],
        title: 'Active Alerts — VitalsDrive',
      },
      {
        path: 'backoffice',
        canActivate: [allowlistGuard, onboardingGuard, adminGuard],
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
            path: 'devices',
            loadComponent: () =>
              import('./pages/backoffice/device-list/device-list.component').then(
                (m) => m.DeviceListComponent,
              ),
            title: 'Manage Devices — VitalsDrive',
          },
          {
            path: 'devices/:id',
            loadComponent: () =>
              import('./pages/backoffice/device-detail/device-detail.component').then(
                (m) => m.DeviceDetailComponent,
              ),
            title: 'Device Details — VitalsDrive',
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
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
