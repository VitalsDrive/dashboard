import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = this.auth.isLoading;
  error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    this.error.set(null);

    const result = await this.auth.signUp();

    if (result.user) {
      this.router.navigate(['/onboarding']);
    } else if (result.error) {
      this.error.set(result.error.message ?? 'Signup failed');
    } else {
      this.error.set('Signup successful! Please check your email to confirm your account.');
    }
  }
}
