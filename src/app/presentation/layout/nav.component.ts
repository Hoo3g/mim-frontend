import { Component, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { authSignal } from '../../core/signals/auth.signal';
import { AuthService } from '../../core/services/auth.service';
import { ROUTES } from '../../core/constants/route.const';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="bg-white border-b border-gray-200 font-sans sticky top-0 z-50">
      <!-- Top Bar -->
      <div class="bg-hus-blue text-white text-[10px] uppercase tracking-widest py-1.5 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex justify-between items-center font-bold">
          <div class="flex space-x-6">
            <span>(+84) 24 38 58 11 35</span>
            <span class="hidden sm:inline">office&#64;mim.hus.edu.vn</span>
          </div>
          <div class="space-x-4">
            <a href="#" class="hover:text-hus-dark transition">TRANG CHỦ HUS</a>
            <span class="opacity-30">|</span>
            <a href="#" class="hover:text-hus-dark transition">CÁN BỘ</a>
          </div>
        </div>
      </div>

      <!-- Main Navbar -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-3 group">
            <img src="assets/logo.png" alt="Logo" class="h-10 w-auto transition-transform group-hover:scale-110">
            <div class="flex flex-col border-l-2 border-hus-blue pl-3">
              <span class="text-gray-900 font-bold text-sm uppercase tracking-tighter leading-none group-hover:text-hus-blue transition-colors">Khoa Toán - Cơ - Tin học</span>
              <span class="text-hus-blue text-[9px] uppercase tracking-tight font-black mt-0.5">Faculty of Mathematics - Mechanics - Informatics</span>
            </div>
          </a>

          <!-- Nav Links -->
          <div class="hidden md:flex space-x-6 h-full items-center">
            <a routerLink="/" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              NGHIÊN CỨU
            </a>
            <a routerLink="/recruitment" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              TUYỂN DỤNG
            </a>
            <a href="#" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              ĐÀO TẠO
            </a>
            <a href="#" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              TIN TỨC
            </a>

            <div *ngIf="!isAuth()" class="ml-4 pl-4 border-l border-gray-100 flex items-center gap-4 h-full">
              <a [routerLink]="ROUTES.AUTH.LOGIN" class="text-gray-600 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest transition-colors">
                Đăng nhập
              </a>
              <a [routerLink]="ROUTES.AUTH.REGISTER" class="text-white bg-hus-blue hover:bg-hus-dark px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors">
                Đăng ký
              </a>
            </div>
            
            <!-- Profile -->
            <div *ngIf="isAuth()" class="relative ml-4 pl-4 border-l border-gray-100 flex items-center h-full">
              <div (click)="toggleProfileMenu($event)" class="flex items-center gap-2 group cursor-pointer">
                <div class="w-8 h-8 rounded-full bg-hus-blue/5 p-0.5 border border-hus-blue/10 group-hover:border-hus-blue/30 transition-all duration-300 relative">
                  <div class="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <img *ngIf="currentUser()?.avatarUrl" [src]="currentUser()?.avatarUrl" class="w-full h-full object-cover">
                    <span *ngIf="!currentUser()?.avatarUrl" class="text-[10px] font-black text-hus-blue uppercase">
                      {{ (currentUser()?.fullName?.charAt(0) || 'U') }}
                    </span>
                  </div>
                  <div class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-gray-400 group-hover:text-hus-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <!-- Dropdown -->
              <div *ngIf="showProfileMenu" class="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div class="px-4 py-3 border-b border-gray-50">
                  <p class="text-[9px] font-black text-hus-blue uppercase tracking-widest mb-0.5">Xin chào,</p>
                  <p class="text-[11px] font-bold text-gray-900 uppercase tracking-tight">{{ currentUser()?.fullName }}</p>
                </div>
                
                <a *ngIf="isAdmin()" routerLink="/admin" (click)="showProfileMenu = false" class="flex items-center gap-3 px-4 py-2.5 text-hus-blue bg-blue-50/50 hover:bg-blue-50 transition-colors group text-[10px] font-black uppercase tracking-widest border-l-4 border-hus-blue">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Hệ thống Quản trị
                </a>
                
                <a href="#" class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Thông tin cá nhân
                </a>
                
                <a [routerLink]="ROUTES.RESEARCH_MY_PAPERS"
                   (click)="showProfileMenu = false"
                   class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Bài viết của tôi
                </a>
                <a href="#" class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Đã lưu
                </a>
                <div class="mt-1 pt-1 border-t border-gray-50">
                  <button (click)="logout()" class="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors group text-[10px] font-black uppercase tracking-widest">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `
})
export class NavComponent {
  private el = inject(ElementRef);
  private authService = inject(AuthService);

  // Use signals for better reactivity
  isAuth = authSignal.isAuth;
  isAdmin = authSignal.isAdmin;
  currentUser = authSignal.user;
  protected readonly ROUTES = ROUTES;

  showProfileMenu = false;

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
  }

  @HostListener('document:click', ['$event'])
  closeMenu(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showProfileMenu = false;
    }
  }

  logout(): void {
    this.showProfileMenu = false;
    this.authService.logout().subscribe();
  }
}
