import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
          <button (click)="userType = 'STUDENT'" 
                  [class.border-hus-blue]="userType === 'STUDENT'"
                  [class.text-hus-blue]="userType === 'STUDENT'"
                  class="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
            Sinh viên
          </button>
          <button (click)="userType = 'OTHERS'" 
                  [class.border-hus-blue]="userType === 'OTHERS'"
                  [class.text-hus-blue]="userType === 'OTHERS'"
                  class="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
            Giảng viên / Doanh nghiệp
          </button>
        </div>

        <!-- Student Flow -->
        <form *ngIf="userType === 'STUDENT'" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mã sinh viên</label>
              <input type="text" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm" placeholder="Ví dụ: 2100xxxx">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Họ và tên</label>
              <input type="text" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm" placeholder="Nguyễn Văn A">
            </div>
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mật khẩu</label>
              <input type="password" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue sm:text-sm" placeholder="********">
            </div>
          </div>

          <div>
            <button type="submit" class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-[11px] font-bold uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hus-blue transition-all">
              Tạo tài khoản ngay
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
          <a routerLink="/" class="text-gray-400 hover:text-hus-blue transition-colors">Quay lại Trang chủ</a>
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class RegisterComponent {
    userType: 'STUDENT' | 'OTHERS' = 'STUDENT';
}
