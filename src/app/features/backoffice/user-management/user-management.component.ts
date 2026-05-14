import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-management">
      <h1>User Management</h1>
      <p>User management interface coming soon...</p>
    </div>
  `,
  styles: [`
    .user-management { padding: 24px; }
    h1 { margin: 0 0 16px; font-size: 24px; }
    p { color: #9ca3af; }
  `]
})
export class UserManagementComponent {}
