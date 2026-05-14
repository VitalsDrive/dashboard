import { Routes } from '@angular/router';
import { authGuard, authGuardChild, onboardingGuard, onboardingStepGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Public / auth routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Login — VitalsDrive',
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/signup/signup.component').then((m) => m.SignupComponent),
    title: 'Sign Up — VitalsDrive',
  },
  {
    path: 'pending',
    loadComponent: () =>
      import('./features/auth/pending/pending.component').then((m) => m.PendingComponent),
    title: 'Account Pending — VitalsDrive',
  },
  {
    path: 'join',
    loadComponent: () =>
      import('./features/auth/join/join.component').then((m) => m.JoinComponent),
    title: 'Join Fleet — VitalsDrive',
  },

  // Protected routes (inside shell)
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
          { path: '', redirectTo: 'organization', pathMatch: 'full' },
          {
            path: 'organization',
            loadComponent: () =>
              import('./features/onboarding/organization/onboarding-organization.component').then(
                (m) => m.OnboardingOrganizationComponent,
              ),
            title: 'Create Organization — VitalsDrive',
          },
          {
            path: 'fleet',
            loadComponent: () =>
              import('./features/onboarding/fleet/onboarding-fleet.component').then(
                (m) => m.OnboardingFleetComponent,
              ),
            title: 'Create Fleet — VitalsDrive',
          },
          {
            path: 'vehicle',
            loadComponent: () =>
              import('./features/onboarding/vehicle/onboarding-vehicle.component').then(
                (m) => m.OnboardingVehicleComponent,
              ),
            title: 'Add Your First Vehicle — VitalsDrive',
          },
          {
            path: 'complete',
            loadComponent: () =>
              import('./features/onboarding/complete/onboarding-complete.component').then(
                (m) => m.OnboardingCompleteComponent,
              ),
            title: 'Setup Complete — VitalsDrive',
          },
        ],
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [onboardingGuard],
        title: 'Fleet Dashboard — VitalsDrive',
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./features/fleet-map/fleet-map.component').then((m) => m.FleetMapComponent),
        canActivate: [onboardingGuard],
        title: 'Fleet Map — VitalsDrive',
      },
      {
        path: 'vehicle/:id',
        loadComponent: () =>
          import('./features/vehicle-detail/vehicle-detail.component').then(
            (m) => m.VehicleDetailComponent,
          ),
        canActivate: [onboardingGuard],
        title: 'Vehicle Details — VitalsDrive',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/alerts/alerts.component').then((m) => m.AlertsComponent),
        canActivate: [onboardingGuard],
        title: 'Active Alerts — VitalsDrive',
      },
      {
        path: 'fleet-management',
        loadComponent: () =>
          import('./features/fleet-management/fleet-management.component').then(
            (m) => m.FleetManagementComponent,
          ),
        canActivate: [onboardingGuard],
        title: 'Fleet Management — VitalsDrive',
      },
      {
        path: 'settings/invite',
        loadComponent: () =>
          import('./features/settings/invite/invite.component').then((m) => m.InviteComponent),
        canActivate: [onboardingGuard],
        title: 'Invite Members — VitalsDrive',
      },
      {
        path: 'backoffice',
        canActivate: [onboardingGuard, adminGuard],
        children: [
          { path: '', redirectTo: 'fleets', pathMatch: 'full' },
          {
            path: 'fleets',
            loadComponent: () =>
              import('./features/backoffice/fleet-list/fleet-list.component').then(
                (m) => m.FleetListComponent,
              ),
            title: 'Manage Fleets — VitalsDrive',
          },
          {
            path: 'fleets/:id',
            loadComponent: () =>
              import('./features/backoffice/fleet-detail/fleet-detail.component').then(
                (m) => m.FleetDetailComponent,
              ),
            title: 'Fleet Details — VitalsDrive',
          },
          {
            path: 'vehicles',
            loadComponent: () =>
              import('./features/backoffice/vehicle-list/vehicle-list.component').then(
                (m) => m.VehicleListComponent,
              ),
            title: 'Manage Vehicles — VitalsDrive',
          },
          {
            path: 'vehicles/:id',
            loadComponent: () =>
              import('./features/backoffice/vehicle-edit/vehicle-edit.component').then(
                (m) => m.VehicleEditComponent,
              ),
            title: 'Edit Vehicle — VitalsDrive',
          },
          {
            path: 'devices',
            loadComponent: () =>
              import('./features/backoffice/device-list/device-list.component').then(
                (m) => m.DeviceListComponent,
              ),
            title: 'Manage Devices — VitalsDrive',
          },
          {
            path: 'devices/:id',
            loadComponent: () =>
              import('./features/backoffice/device-detail/device-detail.component').then(
                (m) => m.DeviceDetailComponent,
              ),
            title: 'Device Details — VitalsDrive',
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/backoffice/user-management/user-management.component').then(
                (m) => m.UserManagementComponent,
              ),
            title: 'User Management — VitalsDrive',
          },
        ],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
