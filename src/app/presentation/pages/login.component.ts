import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { ROUTES } from '../../core/constants/route.const';
import { AuthService } from '../../core/services/auth.service';
import { AuthResponse } from '../../features/auth/models/auth.model';

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
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-400">Email hoặc mã sinh viên</label>
              <input
                type="text"
                [(ngModel)]="identifier"
                name="identifier"
                required
                class="block w-full border border-gray-300 px-3 py-2 text-[13px] text-gray-900 placeholder-gray-500 focus:border-hus-blue focus:outline-none focus:ring-hus-blue sm:text-sm"
                placeholder="you@example.com hoặc 21001234">
            </div>
            <div>
              <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-400">Mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                class="block w-full border border-gray-300 px-3 py-2 text-[13px] text-gray-900 placeholder-gray-500 focus:border-hus-blue focus:outline-none focus:ring-hus-blue sm:text-sm"
                placeholder="********">
            </div>
          </div>

          <p *ngIf="errorMessage" class="text-[11px] font-semibold text-red-600">{{ errorMessage }}</p>

          <button
            type="submit"
            [disabled]="isLoading"
            class="flex w-full justify-center border border-transparent bg-hus-blue px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-hus-dark disabled:cursor-not-allowed disabled:opacity-60">
            {{ isLoading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
    identifier = '';
    password = '';
    errorMessage = '';
    isLoading = false;

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    submitLogin(): void {
        this.errorMessage = '';
        if (!this.identifier.trim() || !this.password) {
            this.errorMessage = 'Vui lòng nhập định danh và mật khẩu.';
            return;
        }

        this.isLoading = true;
        this.authService.login({ identifier: this.identifier.trim(), password: this.password }).pipe(
            finalize(() => (this.isLoading = false))
        ).subscribe({
            next: (auth) => this.handlePostLogin(auth),
            error: (error: unknown) => {
                this.errorMessage = this.extractError(error);
            }
        });
    }

    private handlePostLogin(auth: AuthResponse): void {
        const normalizedStatus = (auth.user.status ?? '').toString().trim().toUpperCase();
        if (normalizedStatus === 'APPROVED') {
            void this.router.navigateByUrl(ROUTES.HOME);
            return;
        }

        void this.router.navigateByUrl(ROUTES.PROFILE, {
            state: {
                notice: 'Tài khoản chưa xác thực email. Bạn vẫn có thể xem nội dung, nhưng chưa thể tạo hoặc đăng bài.'
            }
        });
    }

    private extractError(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            return error.error?.message ?? 'Đăng nhập thất bại.';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Đăng nhập thất bại.';
    }
}
