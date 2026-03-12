import { Component, HostListener, ElementRef, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule } from '@angular/router';
import { authSignal } from '../../core/signals/auth.signal';
import { AuthService } from '../../core/services/auth.service';
import { ROUTES } from '../../core/constants/route.const';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="font-sans fixed inset-x-0 top-0 z-50 transition-shadow duration-300 shadow-sm">
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
      <div class="bg-white border-b border-gray-200 transition-all duration-300"
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

          <button type="button"
                  (click)="toggleMobileMenu($event)"
                  class="md:hidden inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border border-gray-200 text-gray-500 hover:border-hus-blue hover:text-hus-blue transition-colors"
                  [attr.aria-label]="showMobileMenu ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'"
                  [attr.aria-expanded]="showMobileMenu">
            <svg *ngIf="!showMobileMenu" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg *ngIf="showMobileMenu" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Nav Links Desktop -->
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
            <a routerLink="/news" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
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
                
                <a [routerLink]="ROUTES.RESEARCH_MY_PAPERS"
                   (click)="showProfileMenu = false"
                   class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Bài nghiên cứu của tôi
                </a>

                <a *ngIf="canManageRecruitmentPosts()"
                   [routerLink]="ROUTES.RECRUITMENT_EDITOR"
                   (click)="showProfileMenu = false"
                   class="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-hus-blue transition-colors group text-[10px] font-black uppercase tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tạo bài tuyển dụng
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

          <!-- Mobile Menu -->
          <div *ngIf="showMobileMenu" class="md:hidden border-t border-gray-100 py-3 space-y-1">
            <div *ngIf="isAuth(); else mobileGuestEntry" class="pb-3 mb-2 border-b border-gray-100">
              <button type="button"
                      (click)="toggleMobileProfileSection($event)"
                      class="w-full flex items-center justify-between gap-3 px-3 py-2 border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="w-8 h-8 rounded-full bg-hus-blue/5 p-0.5 border border-hus-blue/10 flex items-center justify-center overflow-hidden">
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
                    <span class="block text-[11px] font-bold text-gray-700 truncate">{{ mobileUserName() }}</span>
                  </span>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg"
                     class="h-4 w-4 text-gray-400 transition-transform"
                     [class.rotate-180]="showMobileProfileSection"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div *ngIf="showMobileProfileSection" class="pt-1 pb-1 space-y-1">
                <a *ngIf="canAccessAdmin()"
                   routerLink="/admin"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-hus-blue bg-blue-50 hover:bg-blue-100 transition-colors">
                  Hệ thống Quản trị
                </a>
                <a [routerLink]="ROUTES.PROFILE"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-hus-blue hover:bg-gray-50 transition-colors">
                  Thông tin cá nhân
                </a>
                <a [routerLink]="ROUTES.RESEARCH_MY_PAPERS"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-hus-blue hover:bg-gray-50 transition-colors">
                  Bài viết của tôi
                </a>
                <a [routerLink]="ROUTES.PROFILE"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-hus-blue hover:bg-gray-50 transition-colors">
                  Bài đã lưu
                </a>
                <a *ngIf="canManageRecruitmentPosts()"
                   [routerLink]="ROUTES.RECRUITMENT_EDITOR"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-hus-blue hover:bg-gray-50 transition-colors">
                  Tạo bài tuyển dụng
                </a>
                <a *ngIf="canManageRecruitmentPosts()"
                   [routerLink]="ROUTES.RECRUITMENT_MY_POSTS"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-hus-blue hover:bg-gray-50 transition-colors">
                  Bài tuyển dụng của tôi
                </a>
                <button type="button"
                        (click)="logout()"
                        class="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                  Đăng xuất
                </button>
              </div>
            </div>

            <ng-template #mobileGuestEntry>
              <div class="pb-3 mb-2 border-b border-gray-100 space-y-1">
                <a [routerLink]="ROUTES.AUTH.LOGIN"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-hus-blue hover:bg-gray-50 transition-colors">
                  Đăng nhập
                </a>
                <a [routerLink]="ROUTES.AUTH.REGISTER"
                   (click)="closeMobileMenu()"
                   class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors text-center">
                  Đăng ký
                </a>
              </div>
            </ng-template>

            <a routerLink="/"
               [routerLinkActiveOptions]="{exact: true}"
               routerLinkActive="text-hus-blue bg-blue-50"
               (click)="closeMobileMenu()"
               class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-hus-blue hover:bg-blue-50/50 transition-colors">
              Nghiên cứu
            </a>
            <a routerLink="/recruitment"
               routerLinkActive="text-hus-blue bg-blue-50"
               (click)="closeMobileMenu()"
               class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-hus-blue hover:bg-blue-50/50 transition-colors">
              Tuyển dụng
            </a>
            <a href="#"
               class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-hus-blue hover:bg-blue-50/50 transition-colors">
              Đào tạo
            </a>
            <a routerLink="/news"
               routerLinkActive="text-hus-blue bg-blue-50"
               (click)="closeMobileMenu()"
               class="block px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-hus-blue hover:bg-blue-50/50 transition-colors">
              Bảng tin khoa
            </a>
          </div>
        </div>
      </div>
    </header>
  `
})
export class NavComponent implements OnInit {
  private el = inject(ElementRef);
  private readonly document = inject(DOCUMENT);
  private authService = inject(AuthService);

  // Use signals for better reactivity
  isAuth = authSignal.isAuth;
  isAdmin = authSignal.isAdmin;
  canAccessAdmin = authSignal.canAccessAdmin;
  currentUser = authSignal.user;
  protected readonly ROUTES = ROUTES;

  showProfileMenu = false;
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

  ngOnInit(): void {
    this.resetScrollTracking(this.document.defaultView?.scrollY ?? 0);
    this.syncViewportMode();
    this.syncCondensedStateWithScroll();
    this.applyStickyOffsets();
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showMobileMenu = false;
    this.showProfileMenu = !this.showProfileMenu;
  }

  toggleMobileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = false;
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
      this.showMobileMenu = false;
      this.showMobileProfileSection = false;
    }
  }

  logout(): void {
    this.showProfileMenu = false;
    this.showMobileMenu = false;
    this.showMobileProfileSection = false;
    this.authService.logout().subscribe();
  }

  canManageRecruitmentPosts(): boolean {
    const role = this.currentUser()?.role;
    return role === 'STUDENT' || role === 'COMPANY';
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
      return 640;
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
}
