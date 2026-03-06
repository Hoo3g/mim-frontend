import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ROUTES } from '../../core/constants/route.const';
import { API_CONFIG } from '../../core/config/api.config';

type GoogleIdentityApi = {
    accounts: {
        id: {
            initialize(config: {
                client_id: string;
                callback: (response: { credential: string }) => void;
                auto_select?: boolean;
                cancel_on_tap_outside?: boolean;
            }): void;
            renderButton(
                parent: HTMLElement,
                options: {
                    type?: 'standard' | 'icon';
                    theme?: 'outline' | 'filled_blue' | 'filled_black';
                    size?: 'large' | 'medium' | 'small';
                    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
                    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                    width?: string;
                }
            ): void;
        };
    };
};

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-white p-10 shadow-xl border border-gray-100">
        <div>
          <h2 class="mt-6 text-center text-3xl font-black text-gray-900 uppercase tracking-tighter">Đăng nhập</h2>
          <p class="mt-2 text-center text-[10px] font-bold text-hus-blue uppercase tracking-widest">
            Cổng thông tin Khoa Toán - Cơ - Tin học
          </p>
        </div>

        <form class="mt-8 space-y-6" (ngSubmit)="submitLogin()">
          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email hoặc mã sinh viên</label>
              <input
                type="text"
                [(ngModel)]="identifier"
                name="identifier"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm"
                placeholder="you@example.com hoặc 21001234">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm"
                placeholder="********">
            </div>
          </div>

          <p *ngIf="errorMessage" class="text-[11px] font-semibold text-red-600">{{ errorMessage }}</p>

          <button
            type="submit"
            [disabled]="isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-[11px] font-bold uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hus-blue transition-all">
            {{ isLoading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>
        </form>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200"></div>
          </div>
          <div class="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span class="bg-white px-2 text-gray-400 font-bold">Hoặc</span>
          </div>
        </div>

        <div class="flex justify-center">
          <div #googleButtonContainer></div>
        </div>

        <p *ngIf="showGoogleConfigHint" class="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
          Cần cập nhật <code>GOOGLE_CLIENT_ID</code> trong <code>api.config.ts</code> để bật nút Google Login.
        </p>

        <div class="text-center mt-4 text-[10px] font-bold uppercase tracking-widest">
          <a [routerLink]="ROUTES.AUTH.REGISTER" class="text-gray-500 hover:text-hus-blue transition-colors">
            Chưa có tài khoản? Đăng ký
          </a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements AfterViewInit {
    @ViewChild('googleButtonContainer') googleButtonContainer?: ElementRef<HTMLElement>;

    protected readonly ROUTES = ROUTES;

    identifier = '';
    password = '';
    errorMessage = '';
    isLoading = false;
    showGoogleConfigHint = false;

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    ngAfterViewInit(): void {
        this.renderGoogleButton();
    }

    submitLogin(): void {
        this.errorMessage = '';
        if (!this.identifier || !this.password) {
            this.errorMessage = 'Vui lòng nhập định danh và mật khẩu';
            return;
        }

        this.isLoading = true;
        this.authService.login({ identifier: this.identifier, password: this.password }).pipe(
            finalize(() => (this.isLoading = false))
        ).subscribe({
            next: () => this.router.navigateByUrl(ROUTES.HOME),
            error: (error: unknown) => this.errorMessage = this.extractError(error)
        });
    }

    private renderGoogleButton(): void {
        if (API_CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
            this.showGoogleConfigHint = true;
            return;
        }

        const google = this.googleApi;
        const target = this.googleButtonContainer?.nativeElement;
        if (!google || !target) {
            return;
        }

        google.accounts.id.initialize({
            client_id: API_CONFIG.GOOGLE_CLIENT_ID,
            callback: ({ credential }) => this.loginWithGoogle(credential),
            auto_select: false,
            cancel_on_tap_outside: true
        });

        google.accounts.id.renderButton(target, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: '320'
        });
    }

    private loginWithGoogle(idToken: string): void {
        this.errorMessage = '';
        this.isLoading = true;

        this.authService.loginWithGoogle(idToken).pipe(
            finalize(() => (this.isLoading = false))
        ).subscribe({
            next: () => this.router.navigateByUrl(ROUTES.HOME),
            error: (error: unknown) => this.errorMessage = this.extractError(error)
        });
    }

    private extractError(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            return error.error?.message ?? 'Đăng nhập thất bại';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Đăng nhập thất bại';
    }

    private get googleApi(): GoogleIdentityApi | null {
        const value = (window as Window & { google?: GoogleIdentityApi }).google;
        return value ?? null;
    }
}
