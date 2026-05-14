import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
  imports: [
    MatButtonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  showPassword = signal(false);

  isLoading = this.auth.isLoading;
  error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    this.error.set(null);
    // loginWithRedirect() navigates the browser to Auth0 — nothing runs after this.
    // Token exchange and navigation happen in AuthService.initializeAfterAuth0()
    // once Auth0 redirects back to window.location.origin.
    const result = await this.auth.signIn();
    if (result.error) {
      this.error.set(result.error.message ?? 'Login failed');
    }
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }
}
