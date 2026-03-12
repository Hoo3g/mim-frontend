import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { ProfileMeResponse } from '../../core/models/profile.model';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="min-h-screen bg-gray-50 py-10">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <a
          routerLink="/research"
          class="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-hus-blue transition-colors hover:text-hus-dark"
        >
          Quay lại cổng nghiên cứu
        </a>

        <div *ngIf="vm$ | async as vm" class="mt-6">
          <div *ngIf="vm.error" class="border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-600">
            {{ vm.error }}
          </div>

          <article *ngIf="vm.profile as profile" class="overflow-hidden border border-gray-100 bg-white">
            <div class="bg-hus-blue px-6 py-8 text-white">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div class="h-24 w-24 overflow-hidden border-4 border-white/30 bg-white/10 shadow-lg">
                  <img *ngIf="avatarUrl(profile)"
                       [src]="avatarUrl(profile)"
                       [alt]="displayName(profile)"
                       class="h-full w-full object-cover">
                  <div *ngIf="!avatarUrl(profile)" class="flex h-full w-full items-center justify-center text-3xl font-black uppercase text-white">
                    {{ initials(profile) }}
                  </div>
                </div>

                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">{{ roleLabel(profile) }}</p>
                  <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{{ displayName(profile) }}</h1>
                  <p class="mt-3 max-w-2xl overflow-hidden break-words [overflow-wrap:anywhere] text-sm text-blue-50">{{ headline(profile) }}</p>
                </div>
              </div>
            </div>

            <div class="grid gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]">
              <div class="space-y-6">
                <section *ngIf="isLecturer(profile)" class="space-y-5">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                      <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Học hàm</p>
                      <p class="mt-2 text-sm font-bold text-gray-900">{{ showValue(profile.lecturer?.academicRank) }}</p>
                    </div>
                    <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                      <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Chức danh</p>
                      <p class="mt-2 text-sm font-bold text-gray-900">{{ showValue(profile.lecturer?.title) }}</p>
                    </div>
                  </div>

                  <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Giới thiệu</p>
                    <p class="mt-2 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] whitespace-pre-line text-sm leading-7 text-gray-700">{{ showValue(profile.lecturer?.bio) }}</p>
                  </div>

                  <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Hướng nghiên cứu</p>
                    <div class="mt-3 flex flex-wrap gap-2" *ngIf="(profile.lecturer?.researchInterests?.length ?? 0) > 0; else emptyLecturerInterests">
                      <span
                        *ngFor="let interest of profile.lecturer?.researchInterests"
                        class="border border-hus-blue/20 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-hus-blue"
                      >
                        {{ interest }}
                      </span>
                    </div>
                    <ng-template #emptyLecturerInterests>
                      <p class="mt-2 text-sm text-gray-500">Chưa có thông tin.</p>
                    </ng-template>
                  </div>
                </section>

                <section *ngIf="isStudent(profile)" class="space-y-5">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                      <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Trường</p>
                      <p class="mt-2 text-sm font-bold text-gray-900">{{ showValue(profile.student?.university) }}</p>
                    </div>
                    <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                      <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Chuyên ngành</p>
                      <p class="mt-2 text-sm font-bold text-gray-900">{{ showValue(profile.student?.major) }}</p>
                    </div>
                  </div>

                  <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Giới thiệu</p>
                    <p class="mt-2 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] whitespace-pre-line text-sm leading-7 text-gray-700">{{ showValue(profile.student?.bio) }}</p>
                  </div>

                  <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Thành tích</p>
                    <p class="mt-2 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] whitespace-pre-line text-sm leading-7 text-gray-700">{{ showValue(profile.student?.achievements) }}</p>
                  </div>
                </section>

                <section *ngIf="isCompany(profile)" class="space-y-5">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                      <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Lĩnh vực</p>
                      <p class="mt-2 text-sm font-bold text-gray-900">{{ showValue(profile.company?.industry) }}</p>
                    </div>
                    <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                      <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Khu vực</p>
                      <p class="mt-2 text-sm font-bold text-gray-900">{{ showValue(profile.company?.location) }}</p>
                    </div>
                  </div>

                  <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Giới thiệu</p>
                    <p class="mt-2 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] whitespace-pre-line text-sm leading-7 text-gray-700">{{ showValue(profile.company?.description) }}</p>
                  </div>
                </section>

                <section *ngIf="isAdmin(profile)" class="space-y-3">
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Vai trò hệ thống</p>
                  <p class="text-sm leading-7 text-gray-700">
                    Tài khoản này thuộc nhóm quản trị viên. Hồ sơ công khai chỉ hiển thị thông tin nhận diện cơ bản.
                  </p>
                </section>
              </div>

              <aside class="space-y-4">
                <div class="border border-gray-100 bg-white px-5 py-5">
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Liên hệ</p>
                  <p class="mt-2 break-all text-sm font-semibold text-gray-900">{{ profile.email }}</p>
                </div>

                <div class="border border-gray-100 bg-white px-5 py-5">
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Trạng thái tài khoản</p>
                  <p class="mt-2 text-sm font-semibold text-gray-900">{{ showValue(profile.accountStatus) }}</p>
                </div>

                <a
                  *ngIf="profile.student?.cvUrl"
                  [href]="profile.student?.cvUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex w-full items-center justify-center border border-hus-blue px-4 py-3 text-[10px] font-black uppercase tracking-widest text-hus-blue transition-colors hover:bg-hus-blue hover:text-white"
                >
                  Xem CV
                </a>
              </aside>
            </div>
          </article>
        </div>
      </div>
    </section>
  `
})
export class PublicProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly profileService = inject(ProfileService);

  readonly vm$ = this.route.paramMap.pipe(
    map((params) => params.get('id')?.trim() ?? ''),
    switchMap((userId) => {
      if (!userId) {
        return of({ profile: null, error: 'Thiếu mã người dùng.' });
      }

      return this.profileService.getById(userId).pipe(
        map((profile) => ({ profile, error: '' })),
        catchError(() => of({ profile: null, error: 'Không tìm thấy hồ sơ công khai.' }))
      );
    })
  );

  isStudent(profile: ProfileMeResponse): boolean {
    return profile.role === 'STUDENT';
  }

  isCompany(profile: ProfileMeResponse): boolean {
    return profile.role === 'COMPANY';
  }

  isLecturer(profile: ProfileMeResponse): boolean {
    return profile.role === 'LECTURER';
  }

  isAdmin(profile: ProfileMeResponse): boolean {
    return profile.role === 'ADMIN';
  }

  roleLabel(profile: ProfileMeResponse): string {
    if (this.isLecturer(profile)) {
      return 'Giảng viên';
    }
    if (this.isCompany(profile)) {
      return 'Doanh nghiệp';
    }
    if (this.isAdmin(profile)) {
      return 'Quản trị viên';
    }
    return 'Sinh viên';
  }

  displayName(profile: ProfileMeResponse): string {
    if (this.isLecturer(profile)) {
      return this.combineName(profile.lecturer?.firstName, profile.lecturer?.lastName) || profile.email;
    }
    if (this.isStudent(profile)) {
      return this.combineName(profile.student?.firstName, profile.student?.lastName) || profile.email;
    }
    if (this.isCompany(profile)) {
      return this.showValue(profile.company?.name);
    }
    return profile.email;
  }

  headline(profile: ProfileMeResponse): string {
    if (this.isLecturer(profile)) {
      return profile.lecturer?.title || profile.lecturer?.academicRank || 'Hồ sơ giảng viên trong hệ thống nghiên cứu.';
    }
    if (this.isStudent(profile)) {
      return profile.student?.desiredPosition || profile.student?.major || 'Hồ sơ sinh viên trong hệ thống nghiên cứu.';
    }
    if (this.isCompany(profile)) {
      return profile.company?.industry || profile.company?.location || 'Đối tác doanh nghiệp trên cổng hợp tác nghiên cứu.';
    }
    return 'Tài khoản quản trị hệ thống.';
  }

  showValue(value?: string | null): string {
    const normalized = value?.trim();
    return normalized ? normalized : 'Chưa có thông tin';
  }

  avatarUrl(profile: ProfileMeResponse): string {
    if (this.isLecturer(profile)) {
      return profile.lecturer?.avatarUrl?.trim() || profile.avatarUrl?.trim() || '';
    }
    return profile.avatarUrl?.trim() || '';
  }

  initials(profile: ProfileMeResponse): string {
    const parts = this.displayName(profile)
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return 'U';
    }

    return parts.slice(0, 2).map((item) => item.charAt(0)).join('').toUpperCase();
  }

  private combineName(firstName?: string | null, lastName?: string | null): string {
    return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
  }
}
