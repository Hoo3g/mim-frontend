import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ROUTES } from '../../core/constants/route.const';
import { API_CONFIG } from '../../core/config/api.config';
import { SpecializationService } from '../../core/services/specialization.service';
import { AuthResponse, GoogleLoginRequest, UserType } from '../../features/auth/models/auth.model';

type GoogleIdentityApi = {
    accounts: {
        id: {
            initialize(config: {
                client_id: string;
                callback: (response: { credential: string }) => void;
                auto_select?: boolean;
                cancel_on_tap_outside?: boolean;
            }): void;
            renderButton(
                parent: HTMLElement,
                options: {
                    type?: 'standard' | 'icon';
                    theme?: 'outline' | 'filled_blue' | 'filled_black';
                    size?: 'large' | 'medium' | 'small';
                    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
                    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                    width?: string;
                }
            ): void;
        };
    };
};

type GoogleOnboardingStep = 'TYPE' | 'DETAILS';

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
          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email hoặc mã sinh viên</label>
              <input
                type="text"
                [(ngModel)]="identifier"
                name="identifier"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-[13px] sm:text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                placeholder="you@example.com hoặc 21001234">
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
          </div>

          <p *ngIf="errorMessage" class="text-[11px] font-semibold text-red-600">{{ errorMessage }}</p>

          <button
            type="submit"
            [disabled]="isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-[11px] font-bold uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hus-blue transition-all">
            {{ isLoading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>
        </form>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200"></div>
          </div>
          <div class="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span class="bg-white px-2 text-gray-400 font-bold">Hoặc</span>
          </div>
        </div>

        <div class="w-full">
          <div #googleButtonContainer class="w-full"></div>
        </div>

        <p *ngIf="showGoogleConfigHint" class="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
          Cần cấu hình <code>APP_GOOGLE_CLIENT_ID</code> (runtime env) để bật Google Login.
        </p>

        <div class="text-center mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <span>Chưa có tài khoản? </span>
          <a [routerLink]="ROUTES.AUTH.REGISTER" class="text-hus-blue hover:text-hus-dark transition-colors">
            Đăng ký
          </a>
        </div>
      </div>
    </div>

    <div *ngIf="showGoogleOnboarding" class="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-900/55 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-2xl bg-white border border-gray-100 shadow-2xl p-4 sm:p-8">
        <div class="flex items-start">
          <div>
            <p class="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-hus-blue">Đăng nhập lần đầu</p>
            <h3 class="mt-2 text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              {{ googleOnboardingStep === 'TYPE' ? 'Chọn loại tài khoản' : googleOnboardingTitle() }}
            </h3>
            <p class="mt-3 text-[13px] sm:text-sm text-gray-500 leading-relaxed">
              {{ googleOnboardingStep === 'TYPE'
                ? 'Bắt đầu bằng cách chọn loại tài khoản bạn muốn dùng trong hệ thống.'
                : googleOnboardingDescription() }}
            </p>
          </div>
        </div>

        <ng-container *ngIf="googleOnboardingStep === 'TYPE'; else googleDetailsStep">
          <div class="mt-6 sm:mt-8 space-y-3">
            <button type="button"
                    (click)="googleOnboardingUserType = 'STUDENT'"
                    [class.border-hus-blue]="googleOnboardingUserType === 'STUDENT'"
                    [class.bg-blue-50]="googleOnboardingUserType === 'STUDENT'"
                    class="w-full border border-gray-200 px-4 py-4 text-left transition-colors">
              <p class="text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
                 [class.text-hus-blue]="googleOnboardingUserType === 'STUDENT'"
                 [class.text-gray-900]="googleOnboardingUserType !== 'STUDENT'">
                Sinh viên
              </p>
              <p class="mt-1 text-[13px] sm:text-sm text-gray-500">
                Dùng cho sinh viên cần tạo hồ sơ học thuật và đăng bài tìm việc hoặc bài nghiên cứu.
              </p>
            </button>

            <button type="button"
                    (click)="googleOnboardingUserType = 'LECTURER'"
                    [class.border-hus-blue]="googleOnboardingUserType === 'LECTURER'"
                    [class.bg-blue-50]="googleOnboardingUserType === 'LECTURER'"
                    class="w-full border border-gray-200 px-4 py-4 text-left transition-colors">
              <p class="text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
                 [class.text-hus-blue]="googleOnboardingUserType === 'LECTURER'"
                 [class.text-gray-900]="googleOnboardingUserType !== 'LECTURER'">
                Giảng viên
              </p>
              <p class="mt-1 text-[13px] sm:text-sm text-gray-500">
                Dùng cho giảng viên tham gia hệ thống nghiên cứu và đăng bài nghiên cứu của khoa.
              </p>
            </button>

            <button type="button"
                    (click)="googleOnboardingUserType = 'COMPANY'"
                    [class.border-hus-blue]="googleOnboardingUserType === 'COMPANY'"
                    [class.bg-blue-50]="googleOnboardingUserType === 'COMPANY'"
                    class="w-full border border-gray-200 px-4 py-4 text-left transition-colors">
              <p class="text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
                 [class.text-hus-blue]="googleOnboardingUserType === 'COMPANY'"
                 [class.text-gray-900]="googleOnboardingUserType !== 'COMPANY'">
                Người đại diện doanh nghiệp
              </p>
              <p class="mt-1 text-[13px] sm:text-sm text-gray-500">
                Dùng cho doanh nghiệp đăng nhu cầu tuyển dụng và kết nối với sinh viên.
              </p>
            </button>
          </div>

          <div class="mt-8 flex flex-row gap-2 sm:gap-3 sm:justify-end">
            <button type="button"
                    (click)="closeGoogleOnboarding()"
                    class="flex-1 sm:flex-none px-4 sm:px-5 py-3 border border-gray-200 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors">
              Hủy
            </button>
            <button type="button"
                    (click)="goToGoogleOnboardingDetails()"
                    class="flex-1 sm:flex-none px-4 sm:px-5 py-3 bg-hus-blue text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors">
              Tiếp tục
            </button>
          </div>
        </ng-container>

        <ng-template #googleDetailsStep>
          <div class="mt-6 border border-gray-100 bg-gray-50 px-4 py-3">
            <p class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Loại tài khoản đã chọn</p>
            <p class="mt-1 text-[13px] sm:text-sm font-bold text-gray-900">{{ googleOnboardingTypeLabel() }}</p>
          </div>

          <div class="mt-6 space-y-4">
            <ng-container [ngSwitch]="googleOnboardingUserType">
              <ng-container *ngSwitchCase="'STUDENT'">
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mã sinh viên</label>
                  <input
                    type="text"
                    [(ngModel)]="googleStudentId"
                    name="googleStudentId"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                    placeholder="Ví dụ: 21001234">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Họ và tên</label>
                  <input
                    type="text"
                    [(ngModel)]="googleStudentFullName"
                    name="googleStudentFullName"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                    placeholder="Nguyễn Văn A">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Chuyên ngành</label>
                  <select
                    [(ngModel)]="googleStudentFaculty"
                    name="googleStudentFaculty"
                    [disabled]="isLoadingGoogleStudentFacultyOptions || googleStudentFacultyOptions.length === 0"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue disabled:bg-gray-100 disabled:text-gray-400">
                    <option value="">Chọn Chuyên ngành</option>
                    <option *ngFor="let option of googleStudentFacultyOptions" [value]="option">{{ option }}</option>
                  </select>
                  <p *ngIf="isLoadingGoogleStudentFacultyOptions" class="mt-1 text-[10px] text-gray-400">
                    Đang tải danh sách Chuyên ngành...
                  </p>
                  <p *ngIf="!isLoadingGoogleStudentFacultyOptions && googleStudentFacultyOptions.length === 0" class="mt-1 text-[10px] text-amber-600">
                    Chưa tải được danh sách Chuyên ngành. Vui lòng thử lại.
                  </p>
                </div>
              </ng-container>

              <ng-container *ngSwitchCase="'LECTURER'">
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Họ và tên giảng viên</label>
                  <input
                    type="text"
                    [(ngModel)]="googleLecturerFullName"
                    name="googleLecturerFullName"
                    (blur)="onGoogleLecturerFullNameBlur()"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                    placeholder="Nguyễn Văn B">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Chức danh</label>
                  <select
                    [(ngModel)]="googleLecturerTitle"
                    name="googleLecturerTitle"
                    (ngModelChange)="onGoogleLecturerTitleChange($event)"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue">
                    <option *ngFor="let option of googleLecturerTitleOptions" [value]="option">{{ option }}</option>
                  </select>
                </div>
              </ng-container>

              <ng-container *ngSwitchCase="'COMPANY'">
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tên người đại diện</label>
                  <input
                    type="text"
                    [(ngModel)]="googleCompanyRepresentativeName"
                    name="googleCompanyRepresentativeName"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                    placeholder="Nguyễn Văn C">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tên công ty</label>
                  <input
                    type="text"
                    [(ngModel)]="googleCompanyName"
                    name="googleCompanyName"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                    placeholder="Công ty ABC">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Link website công ty</label>
                  <input
                    type="url"
                    [(ngModel)]="googleCompanyWebsite"
                    name="googleCompanyWebsite"
                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-sm text-gray-900 focus:outline-none focus:ring-hus-blue focus:border-hus-blue"
                    placeholder="https://company.example.com">
                </div>

                <div class="border border-dashed border-hus-blue/30 bg-blue-50/60 px-4 py-4">
                  <p class="text-[10px] font-black uppercase tracking-widest text-hus-blue">Cần hỗ trợ thêm?</p>
                  <p class="mt-2 text-[13px] sm:text-sm text-gray-600 leading-relaxed">
                    Bạn có thể liên hệ trực tiếp với khoa để được hỗ trợ.
                  </p>
                  <a [href]="googleCompanySupportMailto"
                     class="mt-3 inline-flex items-center justify-center px-4 py-2 border border-hus-blue text-[10px] font-black uppercase tracking-widest text-hus-blue hover:bg-white transition-colors">
                    Liên hệ với trường
                  </a>
                </div>
              </ng-container>
            </ng-container>
          </div>

          <p *ngIf="googleOnboardingError" class="mt-4 text-[10px] sm:text-[11px] font-semibold text-red-600">{{ googleOnboardingError }}</p>

          <div class="mt-8 flex items-center justify-between gap-2 sm:gap-3">
            <button type="button"
                    (click)="backToGoogleOnboardingType()"
                    class="inline-flex items-center justify-center px-3 sm:px-4 py-3 border border-gray-200 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors whitespace-nowrap">
              Quay lại
            </button>
            <div class="flex items-center gap-2 sm:gap-3">
              <button type="button"
                      (click)="closeGoogleOnboarding()"
                      class="inline-flex items-center justify-center px-3 sm:px-4 py-3 border border-gray-200 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors whitespace-nowrap">
                Hủy
              </button>
              <button type="button"
                      (click)="submitGoogleOnboarding()"
                      [disabled]="isLoading"
                      class="inline-flex items-center justify-center px-3 sm:px-4 py-3 bg-hus-blue text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] hover:bg-hus-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
                {{ isLoading ? 'Đang xử lý...' : 'Tiếp tục' }}
              </button>
            </div>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class LoginComponent implements AfterViewInit, OnDestroy {
    @ViewChild('googleButtonContainer') googleButtonContainer?: ElementRef<HTMLElement>;

    protected readonly ROUTES = ROUTES;

    readonly googleLecturerTitleOptions = ['Giảng viên', 'ThS', 'TS', 'PGS.TS', 'GS'];
    readonly googleCompanySupportMailto =
        'mailto:office@mim.hus.edu.vn?subject=H%E1%BB%97%20tr%E1%BB%A3%20t%E1%BA%A1o%20t%C3%A0i%20kho%E1%BA%A3n%20doanh%20nghi%E1%BB%87p%20MIM';

    identifier = '';
    password = '';
    errorMessage = '';
    isLoading = false;
    showGoogleConfigHint = false;
    showGoogleOnboarding = false;
    googleOnboardingStep: GoogleOnboardingStep = 'TYPE';
    googleOnboardingUserType: UserType = 'STUDENT';
    googleOnboardingError = '';
    googleStudentId = '';
    googleStudentFullName = '';
    googleStudentFaculty = '';
    googleStudentFacultyOptions: string[] = [];
    isLoadingGoogleStudentFacultyOptions = false;
    googleLecturerFullName = '';
    googleLecturerTitle = this.googleLecturerTitleOptions[0];
    googleCompanyRepresentativeName = '';
    googleCompanyName = '';
    googleCompanyWebsite = '';
    private pendingGoogleIdToken = '';
    private hasInitializedGoogleClient = false;
    private hasRenderedGoogleButton = false;
    private googleButtonRetryHandle: ReturnType<typeof setTimeout> | null = null;
    private googleButtonRetryAttempts = 0;
    private readonly googleButtonMaxRetryAttempts = 40;
    private readonly googleButtonRetryDelayMs = 150;

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly ngZone = inject(NgZone);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly specializationService = inject(SpecializationService);

    ngAfterViewInit(): void {
        this.scheduleGoogleButtonRender(true);
    }

    ngOnDestroy(): void {
        this.clearGoogleButtonRetry();
    }

    submitLogin(): void {
        this.errorMessage = '';
        if (!this.identifier || !this.password) {
            this.errorMessage = 'Vui lòng nhập định danh và mật khẩu';
            return;
        }

        this.isLoading = true;
        this.authService.login({ identifier: this.identifier, password: this.password }).pipe(
            finalize(() => (this.isLoading = false))
        ).subscribe({
            next: (auth) => this.handlePostLogin(auth),
            error: (error: unknown) => this.errorMessage = this.extractError(error)
        });
    }

    goToGoogleOnboardingDetails(): void {
        this.googleOnboardingError = '';
        if (this.googleOnboardingUserType === 'STUDENT') {
            this.loadGoogleStudentFacultyOptions();
        }
        this.googleOnboardingStep = 'DETAILS';
    }

    backToGoogleOnboardingType(): void {
        this.googleOnboardingError = '';
        this.googleOnboardingStep = 'TYPE';
    }

    onGoogleLecturerTitleChange(title: string): void {
        this.googleLecturerTitle = this.normalizeInlineText(title);
        this.syncGoogleLecturerFullNameWithTitle();
    }

    onGoogleLecturerFullNameBlur(): void {
        this.syncGoogleLecturerFullNameWithTitle();
    }

    submitGoogleOnboarding(): void {
        this.googleOnboardingError = '';
        const payload = this.buildGoogleOnboardingPayload();
        if (!payload) {
            return;
        }

        this.isLoading = true;
        this.authService.loginWithGoogle(payload).pipe(
            finalize(() => (this.isLoading = false))
        ).subscribe({
            next: (auth) => {
                this.closeGoogleOnboarding();
                this.handlePostLogin(auth);
            },
            error: (error: unknown) => {
                this.googleOnboardingError = this.extractError(error);
            }
        });
    }

    closeGoogleOnboarding(): void {
        this.showGoogleOnboarding = false;
        this.pendingGoogleIdToken = '';
        this.resetGoogleOnboardingState();
    }

    googleOnboardingTitle(): string {
        if (this.googleOnboardingUserType === 'STUDENT') {
            return 'Hoàn tất hồ sơ sinh viên';
        }
        if (this.googleOnboardingUserType === 'LECTURER') {
            return 'Hoàn tất hồ sơ giảng viên';
        }
        return 'Hoàn tất hồ sơ doanh nghiệp';
    }

    googleOnboardingDescription(): string {
        if (this.googleOnboardingUserType === 'STUDENT') {
            return 'Nhập mã sinh viên, họ tên và khoa để hệ thống tạo hồ sơ sinh viên ban đầu.';
        }
        if (this.googleOnboardingUserType === 'LECTURER') {
            return 'Nhập họ tên và chọn chức danh để hệ thống tạo hồ sơ giảng viên.';
        }
        return 'Nhập thông tin người đại diện, công ty và website để bắt đầu dùng tài khoản doanh nghiệp.';
    }

    googleOnboardingTypeLabel(): string {
        if (this.googleOnboardingUserType === 'STUDENT') {
            return 'Sinh viên';
        }
        if (this.googleOnboardingUserType === 'LECTURER') {
            return 'Giảng viên';
        }
        return 'Người đại diện doanh nghiệp';
    }

    private scheduleGoogleButtonRender(resetAttempts = false): void {
        if (resetAttempts) {
            this.googleButtonRetryAttempts = 0;
            this.hasRenderedGoogleButton = false;
        }

        if (this.hasRenderedGoogleButton) {
            return;
        }

        const rendered = this.renderGoogleButton();
        if (rendered) {
            this.hasRenderedGoogleButton = true;
            this.clearGoogleButtonRetry();
            return;
        }

        if (this.showGoogleConfigHint || this.googleButtonRetryAttempts >= this.googleButtonMaxRetryAttempts) {
            return;
        }

        this.googleButtonRetryAttempts += 1;
        this.clearGoogleButtonRetry();
        this.googleButtonRetryHandle = setTimeout(() => {
            this.scheduleGoogleButtonRender();
        }, this.googleButtonRetryDelayMs);
    }

    private clearGoogleButtonRetry(): void {
        if (this.googleButtonRetryHandle == null) {
            return;
        }
        clearTimeout(this.googleButtonRetryHandle);
        this.googleButtonRetryHandle = null;
    }

    private renderGoogleButton(): boolean {
        if (!API_CONFIG.GOOGLE_CLIENT_ID || API_CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
            this.showGoogleConfigHint = true;
            return true;
        }

        const google = this.googleApi;
        const target = this.googleButtonContainer?.nativeElement;
        if (!google || !target) {
            return false;
        }

        const targetWidth = Math.floor(target.getBoundingClientRect().width);
        if (targetWidth <= 0) {
            return false;
        }

        try {
            if (!this.hasInitializedGoogleClient) {
                google.accounts.id.initialize({
                    client_id: API_CONFIG.GOOGLE_CLIENT_ID,
                    callback: ({ credential }) => this.ngZone.run(() => this.loginWithGoogle(credential)),
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                this.hasInitializedGoogleClient = true;
            }

            target.innerHTML = '';
            const buttonWidth = Math.max(220, targetWidth);
            google.accounts.id.renderButton(target, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: String(buttonWidth)
            });
            return true;
        } catch {
            return false;
        }
    }

    private loginWithGoogle(idToken: string): void {
        this.errorMessage = '';
        this.googleOnboardingError = '';
        this.isLoading = true;

        this.authService.loginWithGoogle({ idToken }).pipe(
            finalize(() => this.ngZone.run(() => (this.isLoading = false)))
        ).subscribe({
            next: (auth) => this.ngZone.run(() => this.handlePostLogin(auth)),
            error: (error: unknown) => {
                this.ngZone.run(() => {
                    if (this.requiresGoogleOnboarding(error)) {
                        this.pendingGoogleIdToken = idToken;
                        this.resetGoogleOnboardingState();
                        this.showGoogleOnboarding = true;
                        this.loadGoogleStudentFacultyOptions();
                        this.cdr.detectChanges();
                        return;
                    }
                    this.errorMessage = this.extractError(error);
                });
            }
        });
    }

    private buildGoogleOnboardingPayload(): GoogleLoginRequest | null {
        if (!this.pendingGoogleIdToken) {
            this.googleOnboardingError = 'Phiên đăng nhập Google không còn hợp lệ. Vui lòng thử lại.';
            return null;
        }

        const payload: GoogleLoginRequest = {
            idToken: this.pendingGoogleIdToken,
            userType: this.googleOnboardingUserType
        };

        if (this.googleOnboardingUserType === 'STUDENT') {
            const studentId = this.googleStudentId.trim().toUpperCase();
            const fullName = this.googleStudentFullName.trim();
            const studentFaculty = this.googleStudentFaculty.trim();

            if (!studentId || !fullName || !studentFaculty) {
                this.googleOnboardingError = 'Vui lòng nhập đầy đủ mã sinh viên, họ tên và chọn Chuyên ngành.';
                return null;
            }

            if (this.googleStudentFacultyOptions.length === 0) {
                this.googleOnboardingError = 'Chưa tải được danh sách Chuyên ngành. Vui lòng thử lại.';
                this.loadGoogleStudentFacultyOptions(true);
                return null;
            }

            if (!this.googleStudentFacultyOptions.includes(studentFaculty)) {
                this.googleOnboardingError = 'Vui lòng chọn Chuyên ngành trong danh sách.';
                return null;
            }

            payload.studentId = studentId;
            payload.fullName = fullName;
            payload.studentFaculty = studentFaculty;
            return payload;
        }

        if (this.googleOnboardingUserType === 'LECTURER') {
            const title = this.normalizeInlineText(this.googleLecturerTitle);
            const fullName = this.stripLecturerTitlePrefix(this.googleLecturerFullName);

            if (!fullName || !title) {
                this.googleOnboardingError = 'Vui lòng nhập họ tên và chọn chức danh.';
                return null;
            }

            this.googleLecturerFullName = this.composeLecturerDisplayName(fullName, title);
            payload.fullName = fullName;
            payload.title = title;
            return payload;
        }

        const representativeName = this.googleCompanyRepresentativeName.trim();
        const companyName = this.googleCompanyName.trim();
        const companyWebsite = this.googleCompanyWebsite.trim();

        if (!representativeName || !companyName || !companyWebsite) {
            this.googleOnboardingError = 'Vui lòng nhập đầy đủ tên người đại diện, tên công ty và website công ty.';
            return null;
        }

        payload.fullName = representativeName;
        payload.companyName = companyName;
        payload.companyWebsite = companyWebsite;
        return payload;
    }

    private resetGoogleOnboardingState(): void {
        this.googleOnboardingStep = 'TYPE';
        this.googleOnboardingUserType = 'STUDENT';
        this.googleOnboardingError = '';
        this.googleStudentId = '';
        this.googleStudentFullName = '';
        this.googleStudentFaculty = '';
        this.googleLecturerFullName = '';
        this.googleLecturerTitle = this.googleLecturerTitleOptions[0];
        this.googleCompanyRepresentativeName = '';
        this.googleCompanyName = '';
        this.googleCompanyWebsite = '';
    }

    private loadGoogleStudentFacultyOptions(forceReload = false): void {
        if (this.isLoadingGoogleStudentFacultyOptions) {
            return;
        }
        if (!forceReload && this.googleStudentFacultyOptions.length > 0) {
            return;
        }

        this.isLoadingGoogleStudentFacultyOptions = true;
        this.specializationService.getActiveSpecializations().pipe(
            finalize(() => (this.isLoadingGoogleStudentFacultyOptions = false))
        ).subscribe((items) => {
            this.googleStudentFacultyOptions = items
                .map((item) => item.name.trim())
                .filter((name) => name.length > 0);

            if (this.googleStudentFaculty && !this.googleStudentFacultyOptions.includes(this.googleStudentFaculty)) {
                this.googleStudentFaculty = '';
            }
        });
    }

    private syncGoogleLecturerFullNameWithTitle(): void {
        const baseFullName = this.stripLecturerTitlePrefix(this.googleLecturerFullName);
        this.googleLecturerFullName = this.composeLecturerDisplayName(baseFullName, this.googleLecturerTitle);
    }

    private composeLecturerDisplayName(fullName: string, title: string): string {
        const normalizedName = this.normalizeInlineText(fullName);
        if (!normalizedName) {
            return '';
        }

        const normalizedTitle = this.normalizeInlineText(title);
        if (!this.isLecturerAbbreviationTitle(normalizedTitle)) {
            return normalizedName;
        }

        return `${normalizedTitle} ${normalizedName}`;
    }

    private stripLecturerTitlePrefix(fullName: string): string {
        const normalizedName = this.normalizeInlineText(fullName);
        if (!normalizedName) {
            return '';
        }

        const normalizedUpper = normalizedName.toUpperCase();
        const sortedTitles = [...this.googleLecturerTitleOptions]
            .filter((item) => this.isLecturerAbbreviationTitle(item))
            .sort((a, b) => b.length - a.length);

        for (const title of sortedTitles) {
            const titleUpper = title.toUpperCase();
            const prefix = `${titleUpper} `;
            if (normalizedUpper.startsWith(prefix)) {
                return normalizedName.slice(prefix.length).trim();
            }
            if (normalizedUpper === titleUpper) {
                return '';
            }
        }

        return normalizedName;
    }

    private isLecturerAbbreviationTitle(title: string): boolean {
        return this.normalizeInlineText(title) !== 'Giảng viên';
    }

    private normalizeInlineText(value: string): string {
        return value.trim().replace(/\s+/g, ' ');
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

    private requiresGoogleOnboarding(error: unknown): boolean {
        return error instanceof HttpErrorResponse
            && String(error.error?.message ?? '').trim().toUpperCase() === 'GOOGLE_ONBOARDING_REQUIRED';
    }

    private extractError(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            return error.error?.message ?? 'Đăng nhập thất bại';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Đăng nhập thất bại';
    }

    private get googleApi(): GoogleIdentityApi | null {
        const value = (window as Window & { google?: GoogleIdentityApi }).google;
        return value ?? null;
    }
}
