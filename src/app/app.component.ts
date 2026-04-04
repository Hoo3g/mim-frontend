import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterModule, RouterOutlet } from '@angular/router';
import { authSignal } from './core/signals/auth.signal';
import { AuthSessionSyncService } from './core/services/auth-session-sync.service';
import { AnalyticsTrackingService } from './core/services/analytics-tracking.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <div class="pointer-events-none fixed inset-x-0 top-0 z-[250] h-[3px]">
        <div class="h-full origin-left bg-hus-blue shadow-[0_0_10px_rgba(59,130,246,0.45)] transition-[transform,opacity] duration-200 ease-out"
             [style.transform]="'scaleX(' + routeProgress + ')'"
             [style.opacity]="isRouteNavigating ? 1 : 0"></div>
      </div>

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
  private readonly authSessionSyncService = inject(AuthSessionSyncService);
  private readonly analyticsTrackingService = inject(AnalyticsTrackingService);
  private readonly router = inject(Router);
  readonly currentYear = new Date().getFullYear();
  isRouteNavigating = false;
  routeProgress = 0;
  private routeEventsSub?: Subscription;
  private routeProgressIntervalId: number | null = null;
  private routeProgressFinishTimeoutId: number | null = null;

  ngOnInit(): void {
    authSignal.restoreFromStorage();
    this.authSessionSyncService.start();
    this.analyticsTrackingService.start();
    this.routeEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.startRouteProgress();
        return;
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.finishRouteProgress();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSessionSyncService.stop();
    this.analyticsTrackingService.stop();
    this.routeEventsSub?.unsubscribe();
    this.clearRouteProgressTimers();
  }

  private startRouteProgress(): void {
    this.clearRouteProgressTimers();
    this.isRouteNavigating = true;
    this.routeProgress = 0.12;
    this.routeProgressIntervalId = window.setInterval(() => {
      if (this.routeProgress >= 0.85) {
        return;
      }
      this.routeProgress = Math.min(this.routeProgress + 0.08, 0.85);
    }, 120);
  }

  private finishRouteProgress(): void {
    if (!this.isRouteNavigating) {
      return;
    }

    this.clearRouteProgressTimers();
    this.routeProgress = 1;
    this.routeProgressFinishTimeoutId = window.setTimeout(() => {
      this.isRouteNavigating = false;
      this.routeProgress = 0;
      this.routeProgressFinishTimeoutId = null;
    }, 220);
  }

  private clearRouteProgressTimers(): void {
    if (this.routeProgressIntervalId !== null) {
      window.clearInterval(this.routeProgressIntervalId);
      this.routeProgressIntervalId = null;
    }

    if (this.routeProgressFinishTimeoutId !== null) {
      window.clearTimeout(this.routeProgressFinishTimeoutId);
      this.routeProgressFinishTimeoutId = null;
    }
  }
}
