import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ROUTES } from '../../core/constants/route.const';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div class="w-full max-w-md bg-white border border-gray-100 shadow-xl p-8">
          <h1 class="text-2xl font-black text-gray-900 uppercase tracking-tighter text-center">
            Xác thực email
          </h1>

          <div *ngIf="status === 'loading'" class="mt-6 text-center text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Đang kiểm tra liên kết xác thực...
          </div>

          <div *ngIf="status === 'success'" class="mt-6 border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-4 text-sm font-semibold">
            {{ message }}
          </div>

          <div *ngIf="status === 'error'" class="mt-6 border border-red-200 bg-red-50 text-red-600 px-4 py-4 text-sm font-semibold">
            {{ message }}
          </div>

          <div class="mt-6 flex flex-col gap-3">
            <a [routerLink]="ROUTES.AUTH.LOGIN"
               class="inline-flex items-center justify-center px-4 py-3 bg-hus-blue text-white text-[11px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors">
              Đăng nhập
            </a>
            <a [routerLink]="ROUTES.PROFILE"
               class="inline-flex items-center justify-center px-4 py-3 border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest hover:border-hus-blue hover:text-hus-blue transition-colors">
              Về hồ sơ
            </a>
          </div>
        </div>
      </div>
    `
})
export class VerifyEmailComponent implements OnInit {
    protected readonly ROUTES = ROUTES;

    private readonly route = inject(ActivatedRoute);
    private readonly authService = inject(AuthService);

    status: 'loading' | 'success' | 'error' = 'loading';
    message = '';

    ngOnInit(): void {
        const token = (this.route.snapshot.queryParamMap.get('token') ?? '').trim();
        if (!token) {
            this.status = 'error';
            this.message = 'Liên kết xác thực không hợp lệ.';
            return;
        }

        this.authService.verifyEmail(token).subscribe({
            next: () => {
                this.status = 'success';
                this.message = 'Email đã được xác thực. Bạn có thể đăng bài và sử dụng đầy đủ các tính năng tạo nội dung.';
                this.authService.syncProfileFromBackend();
            },
            error: (error: { error?: { message?: string } }) => {
                this.status = 'error';
                this.message = error?.error?.message || 'Không thể xác thực email. Vui lòng thử lại.';
            }
        });
    }
}
