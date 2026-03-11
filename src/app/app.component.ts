import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterModule, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { authSignal } from './core/signals/auth.signal';
import { appSignal } from './core/signals/app.signal';
import { AuthService } from './core/services/auth.service';
import { LoadingSpinnerComponent } from './shared/ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LoadingSpinnerComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <app-loading-spinner *ngIf="isRouteLoading()"
                           [fullscreen]="true"
                           [size]="58">
      </app-loading-spinner>

      <router-outlet></router-outlet>

      <footer class="mt-16 bg-white border-t border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <section>
              <a routerLink="/" class="inline-flex items-center gap-3 group">
                <img src="assets/logo.png" alt="MIM Logo" class="h-9 w-auto">
                <div class="border-l-2 border-hus-blue pl-3">
                  <p class="text-[12px] font-black text-gray-900 uppercase tracking-tight leading-none">Khoa Toán - Cơ - Tin học</p>
                  <p class="mt-1 text-[9px] font-bold text-hus-blue uppercase tracking-widest">MIMHUS</p>
                </div>
              </a>
              <p class="mt-4 text-[11px] text-gray-500 leading-relaxed">
                Hệ thống kết nối nghiên cứu, tuyển dụng và hồ sơ học thuật cho giảng viên, sinh viên và doanh nghiệp.
              </p>
            </section>

            <section>
              <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-4">Liên kết nhanh</h3>
              <ul class="space-y-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <li><a routerLink="/" class="hover:text-hus-blue transition-colors">Cổng nghiên cứu</a></li>
                <li><a routerLink="/recruitment" class="hover:text-hus-blue transition-colors">Tuyển dụng & Sự nghiệp</a></li>
                <li><a routerLink="/profile" class="hover:text-hus-blue transition-colors">Thông tin cá nhân</a></li>
                <li><a routerLink="/paper/my-papers" class="hover:text-hus-blue transition-colors">Bài viết của tôi</a></li>
              </ul>
            </section>

            <section>
              <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-4">Thông tin liên hệ</h3>
              <ul class="space-y-3 text-[11px] text-gray-500 leading-relaxed">
                <li class="flex items-start gap-2">
                  <span class="text-hus-blue font-black min-w-16">Điện thoại:</span>
                  <span>(+84) 24 38 58 11 35</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-hus-blue font-black min-w-16">Email:</span>
                  <span>office@mim.hus.edu.vn</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-hus-blue font-black min-w-16">Địa chỉ:</span>
                  <span>334 Nguyễn Trãi, Thanh Xuân, Hà Nội</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-4">Tài nguyên</h3>
              <ul class="space-y-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <li><a href="#" class="hover:text-hus-blue transition-colors">Mẫu CV sinh viên</a></li>
                <li><a href="#" class="hover:text-hus-blue transition-colors">Cẩm nang phỏng vấn</a></li>
                <li><a href="#" class="hover:text-hus-blue transition-colors">Quy định đăng bài</a></li>
                <li><a href="#" class="hover:text-hus-blue transition-colors">Hỗ trợ kỹ thuật</a></li>
              </ul>
            </section>
          </div>
        </div>

        <div class="border-t border-gray-100 bg-gray-50/70">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              © {{ currentYear }} Cổng MIM - HUS VNU
            </p>
            <div class="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <a href="#" class="hover:text-hus-blue transition-colors">Chính sách bảo mật</a>
              <a href="#" class="hover:text-hus-blue transition-colors">Điều khoản sử dụng</a>
              <a href="#" class="hover:text-hus-blue transition-colors">An toàn hệ thống</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly currentYear = new Date().getFullYear();
  readonly isRouteLoading = appSignal.loading;

  private routeLoadingSub?: Subscription;
  private hideLoadingTimer: ReturnType<typeof setTimeout> | null = null;
  private routeLoadingStartedAt = 0;
  private routeLoadingMinDurationMs = 220;

  ngOnInit(): void {
    authSignal.restoreFromStorage();
    this.authService.syncProfileFromBackend();
    this.bindRouteLoadingOverlay();
  }

  ngOnDestroy(): void {
    this.routeLoadingSub?.unsubscribe();
    if (this.hideLoadingTimer) {
      clearTimeout(this.hideLoadingTimer);
      this.hideLoadingTimer = null;
    }
  }

  private bindRouteLoadingOverlay(): void {
    this.routeLoadingSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.beginRouteLoading(event.url);
        return;
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.endRouteLoading();
      }
    });
  }

  private beginRouteLoading(url: string): void {
    if (this.hideLoadingTimer) {
      clearTimeout(this.hideLoadingTimer);
      this.hideLoadingTimer = null;
    }

    this.routeLoadingStartedAt = Date.now();
    this.routeLoadingMinDurationMs = this.resolveRouteLoadingMinDuration(url);
    appSignal.setLoading(true);
  }

  private endRouteLoading(): void {
    const elapsed = Date.now() - this.routeLoadingStartedAt;
    const remaining = Math.max(0, this.routeLoadingMinDurationMs - elapsed);
    if (remaining === 0) {
      appSignal.setLoading(false);
      return;
    }

    this.hideLoadingTimer = setTimeout(() => {
      appSignal.setLoading(false);
      this.hideLoadingTimer = null;
    }, remaining);
  }

  private resolveRouteLoadingMinDuration(url: string): number {
    return url.startsWith('/news') ? 1400 : 220;
  }
}
