import { Component, HostListener, ElementRef, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { authSignal } from '../../core/signals/auth.signal';
import { AuthService } from '../../core/services/auth.service';
import { ROUTES } from '../../core/constants/route.const';
import { AdminNotificationService } from '../../core/services/admin-notification.service';
import { adminNotificationSignal } from '../../core/signals/admin-notification.signal';
import { userNotificationSignal } from '../../core/signals/user-notification.signal';
import { UserModerationNotificationService } from '../../core/services/user-moderation-notification.service';

interface HeaderNotificationItem {
  id: string;
  read: boolean;
  title: string;
  message: string;
  timestamp: number;
  accentLabel: string;
  meta: string;
  route: string;
  adminTab?: 'POSTS' | 'PAPERS';
  isAdminNotification: boolean;
}

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="font-sans fixed inset-x-0 top-0 z-50 transition-shadow duration-300"
            [class.shadow-sm]="!showMobileMenu || isDesktopViewport"
            [class.shadow-none]="showMobileMenu && !isDesktopViewport">
      <!-- Top Bar -->
      <div class="bg-hus-blue text-white text-[10px] uppercase tracking-widest py-1.5 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-3 font-bold">
          <div class="flex items-center gap-4 sm:gap-6 min-w-0">
            <span>(+84) 24 38 58 11 35</span>
            <span class="hidden md:inline">office&#64;mim.hus.edu.vn</span>
          </div>
          <div class="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] whitespace-nowrap">
            <a href="#" class="hover:text-hus-dark transition">TRANG CHỦ HUS</a>
            <span class="opacity-30">|</span>
            <a href="#" class="hover:text-hus-dark transition">CÁN BỘ</a>
          </div>
        </div>
      </div>

      <!-- Main Navbar -->
	      <div class="bg-white transition-all duration-300 md:border-b md:border-gray-200"
	           [class.overflow-hidden]="!isMainNavInteractive()"
           [style.maxHeight.px]="mainNavMaxHeight()"
           [style.opacity]="isMainNavInteractive() ? 1 : 0"
           [style.pointerEvents]="isMainNavInteractive() ? 'auto' : 'none'">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2 sm:gap-3 group">
            <img src="assets/logo.png" alt="Logo" class="h-8 sm:h-10 w-auto transition-transform group-hover:scale-110">
            <div class="hidden sm:flex flex-col border-l-2 border-hus-blue pl-3">
              <span class="text-gray-900 font-bold text-sm uppercase tracking-tighter leading-none group-hover:text-hus-blue transition-colors">
                Khoa Toán - Cơ - Tin học
              </span>
              <span class="text-hus-blue text-[9px] uppercase tracking-tight font-black mt-0.5">
                Faculty of Mathematics - Mechanics - Informatics
              </span>
            </div>
          </a>

          <div class="md:hidden flex items-center gap-2">
            <ng-container *ngIf="!isAuth()">
              <a
                [routerLink]="ROUTES.AUTH.LOGIN"
                class="inline-flex items-center justify-center px-2.5 py-2 text-[8px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors">
                Đăng nhập
              </a>
              <a
                [routerLink]="ROUTES.AUTH.REGISTER"
                class="inline-flex items-center justify-center px-2.5 py-2 text-[8px] font-black uppercase tracking-widest text-gray-600 border border-gray-200 hover:border-hus-blue hover:text-hus-blue transition-colors">
                Đăng ký
              </a>
            </ng-container>

            <div *ngIf="isAuth()" class="relative">
              <button type="button"
                      (click)="toggleNotificationPanel($event)"
                      class="relative inline-flex items-center justify-center p-1 text-gray-500 hover:text-hus-blue transition-colors"
                      title="Thông báo">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span *ngIf="notificationUnreadCount() > 0"
                      class="absolute -top-1.5 -right-1 min-w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-black px-1">
                  {{ notificationUnreadCount() > 99 ? '99+' : notificationUnreadCount() }}
                </span>
              </button>

              <div *ngIf="showNotificationPanel"
                   class="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 shadow-2xl py-2 z-[70]">
                <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p class="text-[10px] font-black text-gray-700 uppercase tracking-widest">{{ notificationPanelTitle() }}</p>
                  <button *ngIf="notificationUnreadCount() > 0"
                          (click)="markAllNotificationsRead()"
                          class="text-[9px] font-bold text-hus-blue uppercase tracking-widest hover:underline">
                    Đọc tất cả
                  </button>
                </div>

                <div class="max-h-[70vh] overflow-y-auto overscroll-contain">
                  <div *ngIf="headerNotifications().length === 0"
                       class="px-4 py-8 text-center text-[11px] text-gray-400 uppercase tracking-widest">
                    Chưa có thông báo mới.
                  </div>

                  <div *ngFor="let notification of headerNotifications()"
                       (click)="openNotification(notification)"
                       class="px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-blue-50/50 transition-colors"
                       [class.bg-blue-50/30]="!notification.read">
                    <div class="flex items-start gap-2">
                      <span class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                            [class.bg-hus-blue]="!notification.read"
                            [class.bg-transparent]="notification.read"></span>
                      <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                          {{ notificationAccentLabel(notification) }}
                        </p>
                        <p class="text-[11px] text-gray-800 font-medium mt-0.5 truncate">{{ notification.title }}</p>
                        <p class="text-[10px] text-gray-500 mt-1 leading-relaxed">{{ notification.message }}</p>
                        <p class="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">
                          {{ notificationMeta(notification) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="button"
                    (click)="toggleMobileMenu($event)"
                    class="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border border-gray-200 text-gray-500 hover:border-hus-blue hover:text-hus-blue transition-colors"
                    [attr.aria-label]="showMobileMenu ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'"
                    [attr.aria-expanded]="showMobileMenu">
              <svg *ngIf="!showMobileMenu" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg *ngIf="showMobileMenu" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Nav Links Desktop -->
          <div class="hidden md:flex space-x-6 h-full items-center">
            <a routerLink="/" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-700 hover:text-hus-blue font-bold text-sm uppercase tracking-tighter h-full flex items-center border-b-[3px] border-transparent transition-all">
              NGHIÊN CỨU
            </a>
            <a routerLink="/recruitment" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-700 hover:text-hus-blue font-bold text-sm uppercase tracking-tighter h-full flex items-center border-b-[3px] border-transparent transition-all">
              TUYỂN DỤNG
            </a>
            <a href="#" class="text-gray-700 hover:text-hus-blue font-bold text-sm uppercase tracking-tighter h-full flex items-center border-b-[3px] border-transparent transition-all">
              ĐÀO TẠO
            </a>
            <a routerLink="/news" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-700 hover:text-hus-blue font-bold text-sm uppercase tracking-tighter h-full flex items-center border-b-[3px] border-transparent transition-all">
              TIN TỨC
            </a>

            <div *ngIf="!isAuth()" class="ml-4 pl-4 border-l border-gray-100 flex items-center gap-4 h-full">
              <a [routerLink]="ROUTES.AUTH.LOGIN" class="text-white bg-hus-blue hover:bg-hus-dark px-3 py-2 font-black text-[9px] uppercase tracking-widest transition-colors">
                Đăng nhập
              </a>
              <a [routerLink]="ROUTES.AUTH.REGISTER" class="text-gray-600 border border-gray-200 hover:border-hus-blue hover:text-hus-blue px-3 py-2 font-bold text-[9px] uppercase tracking-widest transition-colors">
                Đăng ký
              </a>
            </div>
            
            <!-- Profile -->
            <div *ngIf="isAuth()" class="relative ml-4 pl-4 border-l border-gray-100 flex items-center gap-3 h-full">
              <div class="relative">
                <button type="button"
                        (click)="toggleNotificationPanel($event)"
                        class="relative inline-flex items-center justify-center p-1 text-gray-500 hover:text-hus-blue transition-colors"
                        title="Thông báo">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span *ngIf="notificationUnreadCount() > 0"
                        class="absolute -top-1.5 -right-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black px-1">
                    {{ notificationUnreadCount() > 99 ? '99+' : notificationUnreadCount() }}
                  </span>
                </button>

                <div *ngIf="showNotificationPanel"
                     class="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 shadow-2xl py-2 z-[70]">
                  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p class="text-[10px] font-black text-gray-700 uppercase tracking-widest">{{ notificationPanelTitle() }}</p>
                    <button *ngIf="notificationUnreadCount() > 0"
                            (click)="markAllNotificationsRead()"
                            class="text-[9px] font-bold text-hus-blue uppercase tracking-widest hover:underline">
                      Đọc tất cả
                    </button>
                  </div>

                  <div class="max-h-[70vh] overflow-y-auto overscroll-contain">
                    <div *ngIf="headerNotifications().length === 0"
                         class="px-4 py-8 text-center text-[11px] text-gray-400 uppercase tracking-widest">
                      Chưa có thông báo mới.
                    </div>

                    <div *ngFor="let notification of headerNotifications()"
                         (click)="openNotification(notification)"
                         class="px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-blue-50/50 transition-colors"
                         [class.bg-blue-50/30]="!notification.read">
                      <div class="flex items-start gap-2">
                        <span class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                              [class.bg-hus-blue]="!notification.read"
                              [class.bg-transparent]="notification.read"></span>
                        <div class="min-w-0 flex-1">
                          <p class="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                            {{ notificationAccentLabel(notification) }}
                          </p>
                          <p class="text-[11px] text-gray-800 font-medium mt-0.5 truncate">{{ notification.title }}</p>
                          <p class="text-[10px] text-gray-500 mt-1 leading-relaxed">{{ notification.message }}</p>
                          <p class="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">
                            {{ notificationMeta(notification) }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
                
                <a *ngIf="canAccessAdmin()" routerLink="/admin" (click)="showProfileMenu = false" class="flex items-center gap-3 px-4 py-2.5 text-hus-blue bg-blue-50/50 hover:bg-blue-50 transition-colors group text-[10px] font-black uppercase tracking-widest border-l-4 border-hus-blue">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Hệ thống Quản trị
                </a>
                
                <a [routerLink]="ROUTES.PROFILE"
                   (click)="showProfileMenu = false"
                   class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Thông tin cá nhân
                </a>
                
                <a *ngIf="canManageResearchPapers()"
                   [routerLink]="ROUTES.RESEARCH_MY_PAPERS"
                   (click)="showProfileMenu = false"
                   class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Bài nghiên cứu của tôi
                </a>

                <a *ngIf="canManageRecruitmentPosts()"
                   [routerLink]="ROUTES.RECRUITMENT_MY_POSTS"
                   (click)="showProfileMenu = false"
                   class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H5a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 012 2v10a2 2 0 01-2 2z" />
                  </svg>
                  Bài tuyển dụng của tôi
                </a>
                <a [routerLink]="ROUTES.RESEARCH_SAVED_PAPERS"
                   (click)="showProfileMenu = false"
                   class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
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

          <!-- Mobile Menu -->
	          <div *ngIf="showMobileMenu" class="md:hidden relative left-1/2 w-screen -translate-x-1/2 rounded-b-[30px] border-x-2 border-b-2 border-hus-blue/15 bg-gradient-to-b from-blue-50/30 to-white px-4 pt-3 pb-4 shadow-[0_24px_50px_-36px_rgba(24,93,169,0.45)] space-y-3">
	            <div *ngIf="isAuth()" class="mb-1">
	              <button type="button"
	                      (click)="toggleMobileProfileSection($event)"
	                      class="relative w-full flex items-center justify-between gap-3 rounded-2xl border border-hus-blue/15 bg-white px-3 py-2.5 hover:bg-gray-50 transition-colors shadow-sm">
	                <span aria-hidden="true" class="absolute left-3 top-3 bottom-3 w-1 rounded-full bg-hus-blue"></span>
	                <span class="flex items-center gap-3 min-w-0 pl-3">
	                  <span class="w-8 h-8 rounded-full bg-white p-0.5 border border-hus-blue/10 flex items-center justify-center overflow-hidden shadow-sm">
	                    <img *ngIf="currentUser()?.avatarUrl"
	                         [src]="currentUser()?.avatarUrl"
	                         alt="Avatar"
                         class="w-full h-full object-cover">
                    <span *ngIf="!currentUser()?.avatarUrl"
                          class="text-[10px] font-black text-hus-blue uppercase">
                      {{ mobileUserInitial() }}
                    </span>
                  </span>
	                  <span class="min-w-0 text-left">
	                    <span class="block text-[9px] font-black uppercase tracking-widest text-hus-blue">Tài khoản</span>
	                    <span class="block text-[11px] font-bold text-gray-800 truncate">{{ mobileUserName() }}</span>
	                  </span>
	                </span>
	                <svg xmlns="http://www.w3.org/2000/svg"
	                     class="h-4 w-4 text-hus-blue/60 transition-transform"
	                     [class.rotate-180]="showMobileProfileSection"
	                     fill="none"
	                     viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div class="space-y-0">
              <div
                *ngIf="isAuth()"
                class="overflow-hidden transition-all duration-300 ease-out"
                [style.maxHeight.px]="mobileAccountLinksMaxHeight()"
                [style.opacity]="isMobileAccountMenuVisible() ? 1 : 0"
                [style.transform]="isMobileAccountMenuVisible() ? 'translateY(0)' : 'translateY(-8px)'"
                [style.pointerEvents]="isMobileAccountMenuVisible() ? 'auto' : 'none'">
                <div class="space-y-1 pt-1">
                  <a *ngIf="canAccessAdmin()"
                     routerLink="/admin"
                     routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                     (click)="closeMobileMenu()"
                     class="flex items-center gap-3 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>Hệ thống Quản trị</span>
                  </a>
                  <a [routerLink]="ROUTES.PROFILE"
                     routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                     (click)="closeMobileMenu()"
                     class="flex items-center gap-3 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Thông tin cá nhân</span>
                  </a>
                  <a *ngIf="canManageResearchPapers()"
                     [routerLink]="ROUTES.RESEARCH_MY_PAPERS"
                     routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                     (click)="closeMobileMenu()"
                     class="flex items-center gap-3 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Bài viết của tôi</span>
                  </a>
                  <a [routerLink]="ROUTES.RESEARCH_SAVED_PAPERS"
                     routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                     (click)="closeMobileMenu()"
                     class="flex items-center gap-3 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>Bài đã lưu</span>
                  </a>
                  <a *ngIf="canManageRecruitmentPosts()"
                     [routerLink]="ROUTES.RECRUITMENT_MY_POSTS"
                     routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                     (click)="closeMobileMenu()"
                     class="flex items-center gap-3 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H5a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 012 2v10a2 2 0 01-2 2z" />
                    </svg>
                    <span>Bài tuyển dụng của tôi</span>
                  </a>
                  <button type="button"
                          (click)="logout()"
                          class="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>

		              <div
		                class="overflow-hidden transition-all duration-300 ease-out"
		                [style.maxHeight.px]="mobilePrimaryLinksMaxHeight()"
		                [style.opacity]="isMobileAccountMenuVisible() ? 0 : 1"
		                [style.transform]="isMobileAccountMenuVisible() ? 'translateY(-8px)' : 'translateY(0)'"
		                [style.pointerEvents]="isMobileAccountMenuVisible() ? 'none' : 'auto'">
                <a routerLink="/"
                   [routerLinkActiveOptions]="{exact: true}"
                   routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                   (click)="closeMobileMenu()"
                   class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Nghiên cứu</span>
                </a>
                <a routerLink="/recruitment"
                   routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                   (click)="closeMobileMenu()"
                   class="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V7a2 2 0 00-2-2h-3V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v1H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4m-8 0H4m4 0v1a1 1 0 001 1h6a1 1 0 001-1v-1" />
                  </svg>
                  <span>Tuyển dụng</span>
                </a>
                <a href="#"
                   class="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0118 14.576c0 2.69-2.686 4.924-6 4.924s-6-2.233-6-4.924c0-1.46.311-2.845.84-4.078L12 14z" />
                  </svg>
                  <span>Đào tạo</span>
                </a>
                <a routerLink="/news"
                   routerLinkActive="bg-hus-blue/15 text-gray-900 shadow-sm"
                   (click)="closeMobileMenu()"
                   class="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h11a2 2 0 012 2v1m0 13a2 2 0 002-2V9a2 2 0 00-2-2m0 13a2 2 0 01-2-2V9a2 2 0 012-2m-8 3h4m-4 4h6m-6 4h6M7 10h.01M7 14h.01M7 18h.01" />
                  </svg>
                  <span>Bảng tin khoa</span>
                </a>
              </div>
            </div>

	            <div *ngIf="!isAuth()" class="pt-3 mt-2 space-y-1">
	              <a [routerLink]="ROUTES.AUTH.LOGIN"
	                 (click)="closeMobileMenu()"
	                 class="block px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors text-center">
                Đăng nhập
              </a>
	              <a [routerLink]="ROUTES.AUTH.REGISTER"
	                 (click)="closeMobileMenu()"
	                 class="block px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-600 border border-gray-200 hover:text-hus-blue hover:border-hus-blue hover:bg-gray-50 transition-colors text-center">
	                Đăng ký
	              </a>
	            </div>
	          </div>
        </div>
      </div>
    </header>
  `
})
export class NavComponent implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private authService = inject(AuthService);
  private readonly adminNotificationService = inject(AdminNotificationService);
  private readonly userModerationNotificationService = inject(UserModerationNotificationService);

  // Use signals for better reactivity
  isAuth = authSignal.isAuth;
  isAdmin = authSignal.isAdmin;
  canAccessAdmin = authSignal.canAccessAdmin;
  currentUser = authSignal.user;
  readonly adminNotifications = adminNotificationSignal.notifications;
  readonly adminNotificationUnreadCount = adminNotificationSignal.unreadCount;
  readonly userNotifications = userNotificationSignal.notifications;
  readonly userNotificationUnreadCount = userNotificationSignal.unreadCount;
  protected readonly ROUTES = ROUTES;

  showProfileMenu = false;
  showNotificationPanel = false;
  showMobileMenu = false;
  showMobileProfileSection = false;
  isCondensed = false;
  isDesktopViewport = true;
  private lastScrollY = 0;
  private scrollDirection: 'up' | 'down' | null = null;
  private scrollTravelSinceDirectionChange = 0;
  private readonly expandedNavOffset = 92;
  private readonly condensedNavOffset = 28;
  private readonly sidebarGap = 32;
  private readonly desktopBreakpoint = 768;
  private readonly topOnlyNavModeBreakpoint = 1024;
  private readonly mobileShowTopThreshold = 8;
  private readonly topResetThreshold = 24;
  private readonly hideNavMinScrollY = 96;
  private readonly hideNavTravelThreshold = 56;
  private readonly showNavTravelThreshold = 36;
  private readonly minMeaningfulScrollDelta = 2;

  constructor() {
    effect(() => {
      const isAuthenticated = this.isAuth();
      const canUseAdminNotifications = this.canAccessAdmin();

      if (!isAuthenticated) {
        this.showNotificationPanel = false;
        this.adminNotificationService.disconnect();
        this.userModerationNotificationService.stop();
        adminNotificationSignal.clearAll();
        return;
      }

      if (canUseAdminNotifications) {
        this.userModerationNotificationService.stop();
        this.adminNotificationService.connect();
        return;
      }

      this.adminNotificationService.disconnect();
      adminNotificationSignal.clearAll();
      this.userModerationNotificationService.start();
    });
  }

  ngOnInit(): void {
    this.resetScrollTracking(this.document.defaultView?.scrollY ?? 0);
    this.syncViewportMode();
    this.syncCondensedStateWithScroll();
    this.applyStickyOffsets();
  }

  ngOnDestroy(): void {
    this.adminNotificationService.disconnect();
    this.userModerationNotificationService.stop();
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showMobileMenu = false;
    this.showNotificationPanel = false;
    this.showProfileMenu = !this.showProfileMenu;
  }

  toggleNotificationPanel(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = false;
    this.showMobileMenu = false;
    this.showMobileProfileSection = false;
    this.showNotificationPanel = !this.showNotificationPanel;
  }

  toggleMobileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = false;
    this.showNotificationPanel = false;
    this.showMobileMenu = !this.showMobileMenu;
    if (!this.showMobileMenu) {
      this.showMobileProfileSection = false;
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    this.showMobileProfileSection = false;
  }

  toggleMobileProfileSection(event: Event): void {
    event.stopPropagation();
    this.showMobileProfileSection = !this.showMobileProfileSection;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportMode();
    this.syncCondensedStateWithScroll();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    // Keep header fully fixed/expanded on every scroll position.
    this.setCondensed(false);
    this.lastScrollY = this.document.defaultView?.scrollY ?? 0;
  }

  @HostListener('document:click', ['$event'])
  closeMenu(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showProfileMenu = false;
      this.showNotificationPanel = false;
      this.showMobileMenu = false;
      this.showMobileProfileSection = false;
    }
  }

  logout(): void {
    this.showProfileMenu = false;
    this.showNotificationPanel = false;
    this.showMobileMenu = false;
    this.showMobileProfileSection = false;
    adminNotificationSignal.clearAll();
    this.userModerationNotificationService.stop();
    this.authService.logout().subscribe();
  }

  canManageRecruitmentPosts(): boolean {
    const role = this.currentUser()?.role;
    return role === 'STUDENT' || role === 'COMPANY';
  }

  canManageResearchPapers(): boolean {
    const role = this.currentUser()?.role;
    return role === 'STUDENT' || role === 'LECTURER';
  }

  notificationUnreadCount(): number {
    return this.canAccessAdmin()
      ? this.adminNotificationUnreadCount()
      : this.userNotificationUnreadCount();
  }

  notificationPanelTitle(): string {
    return this.canAccessAdmin() ? 'Thông báo kiểm duyệt' : 'Thông báo của bạn';
  }

  headerNotifications(): HeaderNotificationItem[] {
    if (this.canAccessAdmin()) {
      return this.adminNotifications().map((notification) => ({
        id: notification.id,
        read: notification.read,
        title: notification.contentTitle,
        message: `Nội dung mới từ ${notification.authorLabel}.`,
        timestamp: notification.timestamp,
        accentLabel: notification.contentType === 'PAPER' ? 'Bài nghiên cứu chờ duyệt' : 'Tin tuyển dụng chờ duyệt',
        meta: `${notification.authorLabel} · ${this.formatNotificationTime(notification.timestamp)}`,
        route: ROUTES.ADMIN,
        adminTab: notification.contentType === 'PAPER' ? 'PAPERS' : 'POSTS',
        isAdminNotification: true
      }));
    }

    return this.userNotifications().map((notification) => ({
      id: notification.id,
      read: notification.read,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp,
      accentLabel: notification.status === 'APPROVED' ? 'Đã được duyệt' : 'Cần xem lại',
      meta: `${notification.contentType === 'PAPER' ? 'Bài nghiên cứu' : 'Tin tuyển dụng'} · ${this.formatNotificationTime(notification.timestamp)}`,
      route: notification.contentType === 'PAPER' ? ROUTES.RESEARCH_MY_PAPERS : ROUTES.RECRUITMENT_MY_POSTS,
      isAdminNotification: false
    }));
  }

  notificationAccentLabel(notification: HeaderNotificationItem): string {
    return notification.accentLabel;
  }

  notificationMeta(notification: HeaderNotificationItem): string {
    return notification.meta;
  }

  markAllNotificationsRead(): void {
    if (this.canAccessAdmin()) {
      adminNotificationSignal.dismissAll();
      return;
    }
    this.userModerationNotificationService.clearAll();
  }

  openNotification(notification: HeaderNotificationItem): void {
    this.showNotificationPanel = false;

    if (notification.isAdminNotification) {
      adminNotificationSignal.markAsRead(notification.id);
      this.router.navigate([notification.route], {
        queryParams: notification.adminTab ? { tab: notification.adminTab } : undefined
      });
      return;
    }

    this.userModerationNotificationService.removeNotification(notification.id);
    this.router.navigateByUrl(notification.route);
  }

  private setCondensed(value: boolean): void {
    if (this.isCondensed === value) {
      return;
    }

    this.isCondensed = value;
    this.applyStickyOffsets();
  }

  private resetScrollTracking(scrollY: number): void {
    this.lastScrollY = scrollY;
    this.scrollDirection = null;
    this.scrollTravelSinceDirectionChange = 0;
  }

  private updateMobileCondensedState(currentScrollY: number): void {
    // Mobile/tablet: header only appears when user is very close to top.
    this.setCondensed(currentScrollY > this.mobileShowTopThreshold);
    if (!this.isCondensed) {
      this.resetScrollTracking(currentScrollY);
    }
  }

  private syncCondensedStateWithScroll(): void {
    this.setCondensed(false);
    this.resetScrollTracking(this.document.defaultView?.scrollY ?? 0);
  }

  private shouldUseTopOnlyNavMode(): boolean {
    const width = this.document.defaultView?.innerWidth ?? this.desktopBreakpoint;
    return width < this.topOnlyNavModeBreakpoint;
  }

  private applyStickyOffsets(): void {
    const rootStyle = this.document.documentElement.style;
    const navOffset = this.isCondensed ? this.condensedNavOffset : this.expandedNavOffset;
    rootStyle.setProperty('--app-nav-offset', `${navOffset}px`);
    rootStyle.setProperty('--app-nav-sidebar-offset', `${navOffset + this.sidebarGap}px`);
  }

  mainNavMaxHeight(): number {
    if (this.showMobileMenu && !this.isDesktopViewport) {
      const viewportHeight = this.document.defaultView?.innerHeight ?? 800;
      return Math.max(viewportHeight, 720);
    }
    return this.isCondensed ? 0 : 64;
  }

  isMainNavInteractive(): boolean {
    if (this.showMobileMenu && !this.isDesktopViewport) {
      return true;
    }
    return !this.isCondensed;
  }

  private syncViewportMode(): void {
    const width = this.document.defaultView?.innerWidth ?? this.desktopBreakpoint;
    const nextDesktopMode = width >= this.desktopBreakpoint;
    if (this.isDesktopViewport === nextDesktopMode) {
      return;
    }

    this.isDesktopViewport = nextDesktopMode;
    if (this.isDesktopViewport) {
      this.showMobileMenu = false;
      this.showMobileProfileSection = false;
    }
  }

  mobileUserName(): string {
    const fullName = this.currentUser()?.fullName?.trim();
    if (fullName) {
      return fullName;
    }

    const email = this.currentUser()?.email ?? '';
    return email.split('@')[0] || 'Người dùng MIM';
  }

  mobileUserInitial(): string {
    const name = this.mobileUserName();
    return name.charAt(0)?.toUpperCase() || 'U';
  }

  isMobileAccountMenuVisible(): boolean {
    return this.isAuth() && this.showMobileProfileSection;
  }

  mobilePrimaryLinksMaxHeight(): number {
    return this.isMobileAccountMenuVisible() ? 0 : 220;
  }

  mobileAccountLinksMaxHeight(): number {
    return this.isMobileAccountMenuVisible() ? 420 : 0;
  }

  private formatNotificationTime(timestamp: number): string {
    const date = new Date(timestamp);
    const timeText = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateText = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit'
    });
    return `${timeText} ${dateText}`;
  }
}
