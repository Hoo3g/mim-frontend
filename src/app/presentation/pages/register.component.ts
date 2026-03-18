import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { ROUTES } from '../../core/constants/route.const';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-white p-10 shadow-xl border border-gray-100">
        <div>
          <h2 class="mt-6 text-center text-3xl font-black text-gray-900 uppercase tracking-tighter">Đăng ký tài khoản</h2>
          <p class="mt-2 text-center text-[10px] font-bold text-hus-blue uppercase tracking-widest">
            Tham gia cộng đồng Khoa Toán - Cơ - Tin học
          </p>
        </div>

        <div class="flex border-b border-gray-100 mb-8">
          <button (click)="selectUserType('STUDENT')"
                  [class.border-hus-blue]="userType === 'STUDENT'"
                  [class.text-hus-blue]="userType === 'STUDENT'"
                  class="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
            Sinh viên
          </button>
          <button (click)="selectUserType('OTHERS')"
                  [class.border-hus-blue]="userType === 'OTHERS'"
                  [class.text-hus-blue]="userType === 'OTHERS'"
                  class="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
            Giảng viên / Doanh nghiệp
          </button>
        </div>

        <!-- Student Flow -->
        <form *ngIf="userType === 'STUDENT'" class="mt-8 space-y-6" (ngSubmit)="submitStudentRegister()">
          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mã sinh viên</label>
              <input
                type="text"
                [(ngModel)]="studentId"
                name="studentId"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm"
                placeholder="Ví dụ: 2100xxxx">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Họ và tên</label>
              <input
                type="text"
                [(ngModel)]="fullName"
                name="fullName"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm"
                placeholder="Nguyễn Văn A">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm"
                placeholder="you@example.com">
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
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm"
                placeholder="********">
            </div>
          </div>

          <p *ngIf="errorMessage" class="text-[11px] font-semibold text-red-600">{{ errorMessage }}</p>
          <p *ngIf="successMessage" class="text-[11px] font-semibold text-emerald-600">{{ successMessage }}</p>

          <div>
            <button
              type="submit"
              [disabled]="isLoading"
              class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-[11px] font-bold uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hus-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {{ isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản ngay' }}
            </button>
          </div>
        </form>

        <!-- Lecturer/Company Flow -->
        <div *ngIf="userType === 'OTHERS'" class="mt-8 space-y-6 text-center">
          <div class="py-10 bg-blue-50/50 border-2 border-dashed border-hus-blue/10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-hus-blue mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-tight mb-2">Liên hệ cấp tài khoản</h3>
            <p class="text-[11px] text-gray-500 leading-relaxed px-6">
              Để đảm bảo bảo mật và xác thực thông tin, tài khoản Giảng viên và Doanh nghiệp sẽ được cấp trực tiếp bởi Ban quản trị Khoa.
            </p>
          </div>
          
          <div class="space-y-4">
            <a href="mailto:office@mim.hus.edu.vn" class="block w-full py-3 px-4 border-2 border-hus-blue text-[11px] font-bold uppercase tracking-widest text-hus-blue hover:bg-hus-blue hover:text-white transition-all">
              Gửi Email cho Khoa
            </a>
            <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Hoặc gọi Hotline: (+84) 24 38 58 11 35</p>
          </div>
        </div>

        <div class="text-center mt-4 text-[10px] font-bold uppercase tracking-widest">
          <a [routerLink]="ROUTES.HOME" class="text-gray-400 hover:text-hus-blue transition-colors">Quay lại Trang chủ</a>
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class RegisterComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly ROUTES = ROUTES;

    userType: 'STUDENT' | 'OTHERS' = 'STUDENT';
    studentId = '';
    fullName = '';
    email = '';
    password = '';
    confirmPassword = '';
    isLoading = false;
    errorMessage = '';
    successMessage = '';

    selectUserType(type: 'STUDENT' | 'OTHERS'): void {
        this.userType = type;
        this.errorMessage = '';
        this.successMessage = '';
    }

    submitStudentRegister(): void {
        if (this.isLoading) {
            return;
        }

        const validationError = this.validateStudentForm();
        if (validationError) {
            this.errorMessage = validationError;
            this.successMessage = '';
            return;
        }

        this.errorMessage = '';
        this.successMessage = '';
        this.isLoading = true;

        this.authService.register({
            email: this.email.trim(),
            password: this.password,
            fullName: this.fullName.trim(),
            studentId: this.studentId.trim(),
            userType: 'STUDENT'
        }).pipe(
            finalize(() => {
                this.isLoading = false;
            })
        ).subscribe({
            next: () => {
                this.successMessage = 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng bài.';
                setTimeout(() => {
                    void this.router.navigateByUrl(ROUTES.AUTH.LOGIN);
                }, 1200);
            },
            error: (error: unknown) => {
                this.errorMessage = this.resolveError(error);
            }
        });
    }

    private validateStudentForm(): string | null {
        if (!this.studentId.trim() || !this.fullName.trim() || !this.email.trim() || !this.password || !this.confirmPassword) {
            return 'Vui lòng nhập đầy đủ thông tin đăng ký.';
        }
        if (!this.email.includes('@')) {
            return 'Email không hợp lệ.';
        }
        if (this.password.length < 6) {
            return 'Mật khẩu phải có ít nhất 6 ký tự.';
        }
        if (this.password !== this.confirmPassword) {
            return 'Mật khẩu xác nhận không khớp.';
        }
        return null;
    }

    private resolveError(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            return error.error?.message ?? 'Đăng ký thất bại.';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Đăng ký thất bại.';
    }
}
