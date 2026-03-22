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
          <h2 class="mt-6 text-center text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter">Đăng ký tài khoản</h2>
          <p class="mt-2 text-center text-[10px] font-bold text-hus-blue uppercase tracking-widest">
            Tham gia cộng đồng Khoa Toán - Cơ - Tin học
          </p>
        </div>

        <div class="grid grid-cols-3 border-b border-gray-100 mb-8">
          <button (click)="selectUserType('STUDENT')"
                  [class.border-hus-blue]="userType === 'STUDENT'"
                  [class.text-hus-blue]="userType === 'STUDENT'"
                  class="py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
            Sinh viên
          </button>
          <button (click)="selectUserType('LECTURER')"
                  [class.border-hus-blue]="userType === 'LECTURER'"
                  [class.text-hus-blue]="userType === 'LECTURER'"
                  class="py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
            Giảng viên
          </button>
          <button (click)="selectUserType('COMPANY')"
                  [class.border-hus-blue]="userType === 'COMPANY'"
                  [class.text-hus-blue]="userType === 'COMPANY'"
                  class="py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
            Doanh nghiệp
          </button>
        </div>

        <form *ngIf="userType === 'STUDENT'" class="mt-8 space-y-6" (ngSubmit)="submitStudentRegister()">
          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mã sinh viên</label>
              <input
                type="text"
                [(ngModel)]="studentId"
                name="studentId"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="Ví dụ: 2100xxxx">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Họ và tên</label>
              <input
                type="text"
                [(ngModel)]="fullName"
                name="fullName"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="Nguyễn Văn A">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="you@example.com">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="********">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="********">
            </div>
          </div>

          <p *ngIf="errorMessage" class="text-[11px] font-semibold text-red-600">{{ errorMessage }}</p>
          <p *ngIf="successMessage" class="text-[11px] font-semibold text-emerald-600">{{ successMessage }}</p>

          <button
            type="submit"
            [disabled]="isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-[11px] font-bold uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hus-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {{ isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản ngay' }}
          </button>
        </form>

        <form *ngIf="userType === 'LECTURER'" class="mt-8 space-y-6" (ngSubmit)="submitLecturerRegister()">
          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Họ và tên giảng viên</label>
              <input
                type="text"
                [(ngModel)]="lecturerFullName"
                name="lecturerFullName"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="Nguyễn Văn B">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="lecturerEmail"
                name="lecturerEmail"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="giangvien@hus.edu.vn">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Chức vụ</label>
              <input
                type="text"
                [(ngModel)]="lecturerTitle"
                name="lecturerTitle"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="Ví dụ: Giảng viên, Trưởng bộ môn">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="lecturerPassword"
                name="lecturerPassword"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="********">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="lecturerConfirmPassword"
                name="lecturerConfirmPassword"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="********">
            </div>
          </div>

          <p *ngIf="errorMessage" class="text-[11px] font-semibold text-red-600">{{ errorMessage }}</p>
          <p *ngIf="successMessage" class="text-[11px] font-semibold text-emerald-600">{{ successMessage }}</p>

          <button
            type="submit"
            [disabled]="isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-[11px] font-bold uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hus-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {{ isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản giảng viên' }}
          </button>
        </form>

        <form *ngIf="userType === 'COMPANY'" class="mt-8 space-y-6" (ngSubmit)="submitCompanyRegister()">
          <div class="space-y-2 text-center">
            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-tight">Đăng ký doanh nghiệp</h3>
            
          </div>

          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tên doanh nghiệp</label>
              <input
                type="text"
                [(ngModel)]="companyName"
                name="companyName"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="Công ty ABC">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email doanh nghiệp</label>
              <input
                type="email"
                [(ngModel)]="companyEmail"
                name="companyEmail"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="hr@company.com">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="companyPassword"
                name="companyPassword"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="********">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                [(ngModel)]="companyConfirmPassword"
                name="companyConfirmPassword"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="********">
            </div>
          </div>

          <p *ngIf="errorMessage" class="text-[11px] font-semibold text-red-600">{{ errorMessage }}</p>
          <p *ngIf="successMessage" class="text-[11px] font-semibold text-emerald-600">{{ successMessage }}</p>

          <button
            type="submit"
            [disabled]="isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-[11px] font-bold uppercase tracking-widest text-white bg-gray-900 hover:bg-hus-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hus-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {{ isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản doanh nghiệp' }}
          </button>
        </form>

        <div class="text-center mt-4 text-[10px] font-bold uppercase tracking-widest">
          <a [routerLink]="ROUTES.AUTH.LOGIN" class="text-gray-400 hover:text-hus-blue transition-colors">Quay lại đăng nhập</a>
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

    userType: 'STUDENT' | 'LECTURER' | 'COMPANY' = 'STUDENT';
    studentId = '';
    fullName = '';
    email = '';
    password = '';
    confirmPassword = '';
    lecturerFullName = '';
    lecturerEmail = '';
    lecturerTitle = '';
    lecturerPassword = '';
    lecturerConfirmPassword = '';
    companyName = '';
    companyEmail = '';
    companyPassword = '';
    companyConfirmPassword = '';
    isLoading = false;
    errorMessage = '';
    successMessage = '';

    selectUserType(type: 'STUDENT' | 'LECTURER' | 'COMPANY'): void {
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

    submitLecturerRegister(): void {
        if (this.isLoading) {
            return;
        }

        const validationError = this.validateLecturerForm();
        if (validationError) {
            this.errorMessage = validationError;
            this.successMessage = '';
            return;
        }

        this.errorMessage = '';
        this.successMessage = '';
        this.isLoading = true;

        this.authService.register({
            email: this.lecturerEmail.trim(),
            password: this.lecturerPassword,
            fullName: this.lecturerFullName.trim(),
            title: this.lecturerTitle.trim(),
            userType: 'LECTURER'
        }).pipe(
            finalize(() => {
                this.isLoading = false;
            })
        ).subscribe({
            next: () => {
                this.successMessage = 'Đăng ký giảng viên thành công. Vui lòng kiểm tra email để xác thực tài khoản.';
                setTimeout(() => {
                    void this.router.navigateByUrl(ROUTES.AUTH.LOGIN);
                }, 1200);
            },
            error: (error: unknown) => {
                this.errorMessage = this.resolveError(error);
            }
        });
    }

    submitCompanyRegister(): void {
        if (this.isLoading) {
            return;
        }

        const validationError = this.validateCompanyForm();
        if (validationError) {
            this.errorMessage = validationError;
            this.successMessage = '';
            return;
        }

        this.errorMessage = '';
        this.successMessage = '';
        this.isLoading = true;

        this.authService.register({
            email: this.companyEmail.trim(),
            password: this.companyPassword,
            fullName: this.companyName.trim(),
            companyName: this.companyName.trim(),
            userType: 'COMPANY'
        }).pipe(
            finalize(() => {
                this.isLoading = false;
            })
        ).subscribe({
            next: () => {
                this.successMessage = 'Đăng ký doanh nghiệp thành công. Vui lòng kiểm tra email để xác thực tài khoản.';
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

    private validateLecturerForm(): string | null {
        if (!this.lecturerFullName.trim() || !this.lecturerEmail.trim() || !this.lecturerTitle.trim() || !this.lecturerPassword || !this.lecturerConfirmPassword) {
            return 'Vui lòng nhập đầy đủ thông tin giảng viên.';
        }
        if (!this.lecturerEmail.includes('@')) {
            return 'Email không hợp lệ.';
        }
        if (this.lecturerPassword.length < 6) {
            return 'Mật khẩu phải có ít nhất 6 ký tự.';
        }
        if (this.lecturerPassword !== this.lecturerConfirmPassword) {
            return 'Mật khẩu xác nhận không khớp.';
        }
        return null;
    }

    private validateCompanyForm(): string | null {
        if (!this.companyName.trim() || !this.companyEmail.trim() || !this.companyPassword || !this.companyConfirmPassword) {
            return 'Vui lòng nhập đầy đủ thông tin doanh nghiệp.';
        }
        if (!this.companyEmail.includes('@')) {
            return 'Email không hợp lệ.';
        }
        if (this.companyPassword.length < 6) {
            return 'Mật khẩu phải có ít nhất 6 ký tự.';
        }
        if (this.companyPassword !== this.companyConfirmPassword) {
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
