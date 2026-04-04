import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, Observable, of, Subject, switchMap } from 'rxjs';

import { ResearchCategory } from '../../core/models/research-category.model';
import { ResearchPaper } from '../../core/models/research-paper.model';
import { ResearchCategoryService } from '../../core/services/research-category.service';
import { ResearchPaperListQuery, ResearchPaperService } from '../../core/services/research-paper.service';

@Component({
  selector: 'app-research-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bg-white min-h-screen">
      <div class="border-b border-gray-100 bg-blue-10 py-5 md:py-8">
        <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tighter mb-1 flex items-center gap-2">
                <span class="w-1 h-6 bg-hus-blue"></span>
                Tìm kiếm nghiên cứu nâng cao
              </h1>
              <p class="text-[10px] font-bold text-hus-blue uppercase tracking-widest pl-3">
                Lọc bài nghiên cứu theo đối tượng, phân loại và từ khóa
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-10">
        <div class="flex flex-col lg:flex-row gap-6 lg:gap-10">
          <aside class="lg:w-64 flex-shrink-0">
            <div class="space-y-3 md:space-y-4 lg:space-y-8 lg:sticky" [style.top]="'var(--app-nav-sidebar-offset, 124px)'">
              <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Tìm kiếm</h3>
                <div class="relative">
                  <input
                    [(ngModel)]="searchKeyword"
                    (ngModelChange)="onSearchKeywordChange($event)"
                    type="text"
                    placeholder="Tên bài viết, tác giả..."
                    class="w-full bg-gray-50 border border-hus-blue/30 px-3 py-2 text-xs focus:ring-1 focus:ring-hus-blue/30 focus:border-hus-blue outline-none transition-all font-medium">
                </div>
              </section>

              <div class="overflow-hidden border border-hus-blue/20 bg-white shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)] lg:overflow-visible lg:border-0 lg:bg-transparent lg:shadow-none lg:space-y-4">
                <section class="bg-white border-t border-hus-blue/20 first:border-t-0 lg:border lg:border-hus-blue/30 lg:shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)]">
                  <button
                    type="button"
                    (click)="toggleMobileSection('specializations')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue border-b border-hus-blue">
                    <h3 class="text-[10px] font-bold text-white uppercase tracking-widest">Phân loại</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-white/80 leading-none min-w-[1rem] text-right">
                      {{ isMobileSectionOpen('specializations') ? '-' : '+' }}
                    </span>
                  </button>

                  <div *ngIf="shouldShowSection('specializations') && isLoadingSpecializations" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                    <div *ngFor="let item of [1, 2, 3, 4]" class="h-9 border border-gray-100 bg-gray-50 animate-pulse"></div>
                  </div>

                  <div *ngIf="shouldShowSection('specializations') && !isLoadingSpecializations" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                    <button
                      type="button"
                      *ngFor="let category of specializations"
                      (click)="toggleSpecializationFilter(category.name)"
                      [class.text-hus-blue]="isSpecializationSelected(category.name)"
                      [class.bg-blue-50]="isSpecializationSelected(category.name)"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 border-2 transition-colors flex items-center justify-center"
                        [ngClass]="isSpecializationSelected(category.name) ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="isSpecializationSelected(category.name)"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span class="min-w-0 flex-1 break-words">{{ category.name }}</span>
                      <span class="shrink-0 text-[10px] font-black tabular-nums text-gray-400"
                            [class.text-hus-blue]="isSpecializationSelected(category.name)">
                        ({{ getSpecializationCount(category.name) }})
                      </span>
                    </button>
                    <div
                      *ngIf="specializations.length === 0"
                      class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 border border-dashed border-gray-100">
                      Chưa có phân loại
                    </div>
                  </div>
                </section>

                <section class="bg-white border-t border-hus-blue/20 first:border-t-0 lg:border lg:border-hus-blue/30 lg:shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)]">
                  <button
                    type="button"
                    (click)="toggleMobileSection('year')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue border-b border-hus-blue">
                    <h3 class="text-[10px] font-bold text-white uppercase tracking-widest">Năm công bố</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-white/80 leading-none min-w-[1rem] text-right">
                      {{ isMobileSectionOpen('year') ? '-' : '+' }}
                    </span>
                  </button>

                  <div *ngIf="shouldShowSection('year')" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                    <select
                      [(ngModel)]="yearFilterValue"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="onYearFilterChange($event)"
                      class="w-full border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-tight text-gray-700 focus:outline-none focus:border-hus-blue">
                      <option value="">Tất cả năm</option>
                      <option *ngFor="let year of availablePublicationYears" [value]="year">{{ year }}</option>
                    </select>
                  </div>
                </section>

                <section class="bg-white border-t border-hus-blue/20 first:border-t-0 lg:border lg:border-hus-blue/30 lg:shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)]">
                  <button
                    type="button"
                    (click)="toggleMobileSection('paperTypes')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue border-b border-hus-blue">
                    <h3 class="text-[10px] font-bold text-white uppercase tracking-widest">Loại bài</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-white/80 leading-none min-w-[1rem] text-right">
                      {{ isMobileSectionOpen('paperTypes') ? '-' : '+' }}
                    </span>
                  </button>

                  <div *ngIf="shouldShowSection('paperTypes')" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                    <button
                      type="button"
                      (click)="setPaperTypeFilter('SCIENTIFIC_RESEARCH')"
                      [class.text-hus-blue]="paperTypeFilter === 'SCIENTIFIC_RESEARCH'"
                      [class.bg-blue-50]="paperTypeFilter === 'SCIENTIFIC_RESEARCH'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                        [ngClass]="paperTypeFilter === 'SCIENTIFIC_RESEARCH' ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="paperTypeFilter === 'SCIENTIFIC_RESEARCH'"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span class="min-w-0 flex-1">Nghiên cứu khoa học</span>
                      <span class="shrink-0 text-[10px] font-black tabular-nums text-gray-400"
                            [class.text-hus-blue]="paperTypeFilter === 'SCIENTIFIC_RESEARCH'">
                        ({{ getPaperTypeCount('SCIENTIFIC_RESEARCH') }})
                      </span>
                    </button>
                    <button
                      type="button"
                      (click)="setPaperTypeFilter('GRADUATION_THESIS')"
                      [class.text-hus-blue]="paperTypeFilter === 'GRADUATION_THESIS'"
                      [class.bg-blue-50]="paperTypeFilter === 'GRADUATION_THESIS'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                        [ngClass]="paperTypeFilter === 'GRADUATION_THESIS' ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="paperTypeFilter === 'GRADUATION_THESIS'"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span class="min-w-0 flex-1">Khóa luận tốt nghiệp</span>
                      <span class="shrink-0 text-[10px] font-black tabular-nums text-gray-400"
                            [class.text-hus-blue]="paperTypeFilter === 'GRADUATION_THESIS'">
                        ({{ getPaperTypeCount('GRADUATION_THESIS') }})
                      </span>
                    </button>
                  </div>
                </section>

                <section class="bg-white border-t border-hus-blue/20 first:border-t-0 lg:border lg:border-hus-blue/30 lg:shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)]">
                  <button
                    type="button"
                    (click)="toggleMobileSection('metrics')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue border-b border-hus-blue">
                    <h3 class="text-[10px] font-bold text-white uppercase tracking-widest">Mức độ quan tâm</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-white/80 leading-none min-w-[1rem] text-right">
                      {{ isMobileSectionOpen('metrics') ? '-' : '+' }}
                    </span>
                  </button>

                  <div *ngIf="shouldShowSection('metrics')" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                    <button
                      type="button"
                      (click)="setMetricSort('views')"
                      [class.text-hus-blue]="metricSort === 'views'"
                      [class.bg-blue-50]="metricSort === 'views'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                        [ngClass]="metricSort === 'views' ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="metricSort === 'views'"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span>Lượt xem</span>
                    </button>
                    <button
                      type="button"
                      (click)="setMetricSort('downloads')"
                      [class.text-hus-blue]="metricSort === 'downloads'"
                      [class.bg-blue-50]="metricSort === 'downloads'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                        [ngClass]="metricSort === 'downloads' ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="metricSort === 'downloads'"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span>Lượt tải</span>
                    </button>
                    <button
                      type="button"
                      (click)="setMetricSort('bookmarks')"
                      [class.text-hus-blue]="metricSort === 'bookmarks'"
                      [class.bg-blue-50]="metricSort === 'bookmarks'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                        [ngClass]="metricSort === 'bookmarks' ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="metricSort === 'bookmarks'"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span>Lượt đánh dấu</span>
                    </button>
                  </div>
                </section>

                <section class="bg-white border-t border-hus-blue/20 first:border-t-0 lg:border lg:border-hus-blue/30 lg:shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)]">
                  <button
                    type="button"
                    (click)="toggleMobileSection('roles')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue border-b border-hus-blue">
                    <h3 class="text-[10px] font-bold text-white uppercase tracking-widest">Đối tượng</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-white/80 leading-none min-w-[1rem] text-right">
                      {{ isMobileSectionOpen('roles') ? '-' : '+' }}
                    </span>
                  </button>

                  <div *ngIf="shouldShowSection('roles')" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                    <button
                      type="button"
                      (click)="setRoleFilter('LECTURER')"
                      [class.text-hus-blue]="roleFilter === 'LECTURER'"
                      [class.bg-blue-50]="roleFilter === 'LECTURER'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                        [ngClass]="roleFilter === 'LECTURER' ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="roleFilter === 'LECTURER'"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span class="min-w-0 flex-1">Giảng viên</span>
                      <span class="shrink-0 text-[10px] font-black tabular-nums text-gray-400"
                            [class.text-hus-blue]="roleFilter === 'LECTURER'">
                        ({{ getRoleCount('LECTURER') }})
                      </span>
                    </button>
                    <button
                      type="button"
                      (click)="setRoleFilter('STUDENT')"
                      [class.text-hus-blue]="roleFilter === 'STUDENT'"
                      [class.bg-blue-50]="roleFilter === 'STUDENT'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-4 h-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                        [ngClass]="roleFilter === 'STUDENT' ? 'border-hus-blue bg-hus-blue' : 'border-gray-400 bg-white'">
                        <svg
                          *ngIf="roleFilter === 'STUDENT'"
                          viewBox="0 0 12 12"
                          class="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true">
                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                      </span>
                      <span class="min-w-0 flex-1">Sinh viên</span>
                      <span class="shrink-0 text-[10px] font-black tabular-nums text-gray-400"
                            [class.text-hus-blue]="roleFilter === 'STUDENT'">
                        ({{ getRoleCount('STUDENT') }})
                      </span>
                    </button>
                  </div>
                </section>
              </div>

              <section *ngIf="shouldShowFilterActions" class="pt-4 border-t border-hus-blue/20">
                <div class="flex justify-center">
                  <button
                    type="button"
                    (click)="clearFilters()"
                    class="px-4 py-2 border border-hus-blue/30 text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-blue-50/40 transition-colors">
                    Xóa bộ lọc
                  </button>
                </div>
              </section>
            </div>
          </aside>

          <div class="lg:hidden pt-1">
            <div class="h-px w-full bg-hus-blue/20"></div>
            <div class="mt-2 h-0.5 w-16 bg-hus-blue"></div>
          </div>

          <div class="flex-grow">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 md:mb-6">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Kết quả lọc</p>
                <h2 class="text font-black text-gray-900 uppercase tracking-tight">
                  {{ totalPaperCount }} bài <span class="text-hus-blue">nghiên cứu</span> phù hợp
                </h2>
              </div>
            </div>

            <div
              *ngIf="allPapers.length === 0 && !isLoadingPapers"
              class="py-14 md:py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
              Không tìm thấy thông tin phù hợp.
            </div>

            <div *ngIf="allPapers.length > 0" class="border border-black/15 bg-white">
              <div
                *ngFor="let paper of allPapers; let index = index"
                class="relative px-5 py-5 sm:px-6 sm:py-6 border-b border-black/15 last:border-b-0 text-left">
                <span
                  *ngIf="index % 2 === 0"
                  aria-hidden="true"
                  class="absolute left-0 top-0 bottom-0 w-1 bg-hus-blue"></span>
                <div class="flex items-start gap-4">
                  <div class="min-w-0 flex-1">
                    <button
                      type="button"
                      (click)="openPaperDetail(paper.id)"
                      class="text-left text-base sm:text-lg font-bold text-gray-900 leading-7 hover:text-hus-blue transition-colors">
                      {{ paper.title }}
                    </button>

                    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span>{{ getMainAuthorName(paper) }}</span>
                      <span class="text-gray-300">•</span>
                      <span>{{ paper.category === 'LECTURER' ? 'Giảng viên' : 'Sinh viên' }}</span>
                      <span class="text-gray-300">•</span>
                      <span>{{ paper.researchArea || 'Chưa phân loại' }}</span>
                      <span class="text-gray-300">•</span>
                      <span>{{ paper.paperType === 'GRADUATION_THESIS' ? 'Khóa luận tốt nghiệp' : 'Nghiên cứu khoa học' }}</span>
                      <span class="text-gray-300">•</span>
                      <span class="tabular-nums">{{ paper.publicationYear }}</span>
                    </div>

                    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold tracking-widest text-gray-400">
                      <span class="inline-flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span class="tabular-nums">{{ paper.viewCount }}</span>
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M7 10l5 5m0 0 5-5m-5 5V3" />
                        </svg>
                        <span class="tabular-nums">{{ paper.downloadCount }}</span>
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <span class="tabular-nums">{{ paper.bookmarkCount }}</span>
                      </span>
                    </div>
                  </div>

                  
                </div>
              </div>
            </div>

            <div *ngIf="hasMorePapers" class="mt-4 border-t border-gray-200 pt-4 flex justify-center">
              <button
                type="button"
                (click)="loadMorePapers()"
                [disabled]="isLoadingPapers"
                class="inline-flex items-center justify-center border border-hus-blue px-3 py-2 text-[11px] font-black leading-none text-hus-blue transition-colors hover:bg-hus-blue hover:text-white">
                <span>Xem thêm</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResearchFilterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly researchCategoryService = inject(ResearchCategoryService);
  private readonly researchPaperService = inject(ResearchPaperService);
  private readonly searchKeywordChanges = new Subject<string>();
  private readonly mobileBreakpoint = 768;
  private readonly countPageSize = 50;

  roleFilter: 'LECTURER' | 'STUDENT' | null = null;
  paperTypeFilter: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS' | null = null;
  metricSort: 'views' | 'downloads' | 'bookmarks' | null = null;
  yearFilter: number | null = null;
  yearFilterValue = '';
  selectedSpecializations: string[] = [];
  searchKeyword = '';
  isLoadingSpecializations = true;
  isLoadingPapers = false;
  hasMorePapers = false;
  totalPaperCount = 0;
  specializations: ResearchCategory[] = [];
  allPapers: ResearchPaper[] = [];
  specializationCounts: Record<string, number> = {};
  paperTypeCounts: Record<'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS', number> = {
    SCIENTIFIC_RESEARCH: 0,
    GRADUATION_THESIS: 0
  };
  roleCounts: Record<'LECTURER' | 'STUDENT', number> = {
    LECTURER: 0,
    STUDENT: 0
  };
  isMobileViewport = false;
  mobileSectionsOpen: Record<'specializations' | 'paperTypes' | 'year' | 'metrics' | 'roles', boolean> = {
    specializations: false,
    paperTypes: false,
    year: false,
    metrics: false,
    roles: false
  };
  private currentPage = 0;
  private readonly pageSize = 10;

  ngOnInit(): void {
    this.updateViewportState();

    this.searchKeywordChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.applyFilters();
      });

    this.researchCategoryService.getActiveCategories().subscribe((items) => {
      this.specializations = items;
      this.isLoadingSpecializations = false;
      this.cdr.detectChanges();
    });

    this.hydrateFiltersFromQuery();
    this.resetAndLoadPapers();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  get shouldShowFilterActions(): boolean {
    return this.roleFilter !== null
      || this.paperTypeFilter !== null
      || this.metricSort !== null
      || this.yearFilter !== null
      || this.selectedSpecializations.length > 0
      || !!this.searchKeyword.trim();
  }

  onSearchKeywordChange(value: string): void {
    this.searchKeyword = value;
    this.searchKeywordChanges.next(value.trim());
  }

  setRoleFilter(value: 'LECTURER' | 'STUDENT'): void {
    this.roleFilter = this.roleFilter === value ? null : value;
    this.applyFilters();
  }

  setPaperTypeFilter(value: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS'): void {
    this.paperTypeFilter = this.paperTypeFilter === value ? null : value;
    this.applyFilters();
  }

  setMetricSort(value: 'views' | 'downloads' | 'bookmarks'): void {
    this.metricSort = this.metricSort === value ? null : value;
    this.applyFilters();
  }

  onYearFilterChange(value: string): void {
    const parsedYear = Number(value);
    this.yearFilter = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : null;
    this.yearFilterValue = this.yearFilter ? String(this.yearFilter) : '';
    this.applyFilters();
  }

  toggleSpecializationFilter(value: string): void {
    const normalizedValue = (value ?? '').trim();
    if (!normalizedValue) {
      return;
    }

    if (this.selectedSpecializations.includes(normalizedValue)) {
      this.selectedSpecializations = this.selectedSpecializations.filter((item) => item !== normalizedValue);
      this.applyFilters();
      return;
    }

    this.selectedSpecializations = [...this.selectedSpecializations, normalizedValue];
    this.applyFilters();
  }

  isSpecializationSelected(value: string): boolean {
    return this.selectedSpecializations.includes((value ?? '').trim());
  }

  shouldShowSection(section: 'specializations' | 'paperTypes' | 'year' | 'metrics' | 'roles'): boolean {
    return !this.isMobileViewport || this.mobileSectionsOpen[section];
  }

  toggleMobileSection(section: 'specializations' | 'paperTypes' | 'year' | 'metrics' | 'roles'): void {
    if (!this.isMobileViewport) {
      return;
    }

    this.mobileSectionsOpen[section] = !this.mobileSectionsOpen[section];
  }

  isMobileSectionOpen(section: 'specializations' | 'paperTypes' | 'year' | 'metrics' | 'roles'): boolean {
    return this.mobileSectionsOpen[section];
  }

  clearFilters(): void {
    this.roleFilter = null;
    this.paperTypeFilter = null;
    this.metricSort = null;
    this.yearFilter = null;
    this.yearFilterValue = '';
    this.selectedSpecializations = [];
    this.searchKeyword = '';
    this.applyFilters();
  }

  loadMorePapers(): void {
    this.loadNextPage();
  }

  backToResearch(): void {
    this.router.navigate(['/research'], {
      queryParams: this.buildResearchQueryParams()
    });
  }

  openPaperDetail(paperId: string): void {
    this.router.navigate(['/paper', paperId]);
  }

  getMainAuthorName(paper: ResearchPaper): string {
    const mainAuthor = paper.authors.find((author) => author.isMainAuthor) ?? paper.authors[0];
    return mainAuthor?.name ?? 'Unknown';
  }

  getSpecializationCount(name: string): number {
    return this.specializationCounts[(name ?? '').trim()] ?? 0;
  }

  getPaperTypeCount(type: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS'): number {
    return this.paperTypeCounts[type] ?? 0;
  }

  getRoleCount(role: 'LECTURER' | 'STUDENT'): number {
    return this.roleCounts[role] ?? 0;
  }

  private parseSpecializationsFromQuery(specializations: string[], fallback: string | null): string[] {
    if (specializations.length > 0) {
      return specializations
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter((item, index, arr) => !!item && arr.indexOf(item) === index);
    }

    if (!fallback?.trim()) {
      return [];
    }

    return fallback
      .split(',')
      .map((item) => item.trim())
      .filter((item, index, arr) => !!item && arr.indexOf(item) === index);
  }

  private loadPapersPage(page: number): void {
    this.researchPaperService.getPapersPage({
      type: this.roleFilter,
      paperType: this.paperTypeFilter,
      specialization: this.selectedSpecializations,
      year: this.yearFilter,
      q: this.searchKeyword,
      metric: this.metricSort
    }, page, this.pageSize).subscribe({
      next: (result) => {
        const incoming = result.content ?? [];
        this.allPapers = page === 0 ? incoming : [...this.allPapers, ...incoming];
        this.totalPaperCount = result.pageInfo?.totalElements ?? this.allPapers.length;
        this.hasMorePapers = this.allPapers.length < this.totalPaperCount;
        this.currentPage = page + 1;
        this.cdr.detectChanges();
      },
      error: () => {
        if (page === 0) {
          this.allPapers = [];
          this.totalPaperCount = 0;
        }
        this.hasMorePapers = false;
        this.isLoadingPapers = false;
      },
      complete: () => {
        this.isLoadingPapers = false;
      }
    });
  }

  private applyFilters(): void {
    this.syncFiltersToUrl();
    this.resetAndLoadPapers();
  }

  private buildResearchQueryParams(): {
    type: 'LECTURER' | 'STUDENT' | null;
    paperType: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS' | null;
    metric: 'views' | 'downloads' | 'bookmarks' | null;
    year: number | null;
    specialization: string[] | null;
    q: string | null;
  } {
    return {
      type: this.roleFilter,
      paperType: this.paperTypeFilter,
      metric: this.metricSort,
      year: this.yearFilter,
      specialization: this.selectedSpecializations.length > 0 ? this.selectedSpecializations : null,
      q: this.searchKeyword.trim() || null
    };
  }

  private hydrateFiltersFromQuery(): void {
    const params = this.route.snapshot.queryParamMap;
    const type = params.get('type');
    const paperType = params.get('paperType');
    const keyword = params.get('q');
    const metric = params.get('metric');
    const year = Number(params.get('year'));

    this.roleFilter = type === 'LECTURER' || type === 'STUDENT' ? type : null;
    this.paperTypeFilter = paperType === 'SCIENTIFIC_RESEARCH' || paperType === 'GRADUATION_THESIS' ? paperType : null;
    this.metricSort = metric === 'views' || metric === 'downloads' || metric === 'bookmarks' ? metric : null;
    this.yearFilter = Number.isFinite(year) && year > 0 ? year : null;
    this.yearFilterValue = this.yearFilter ? String(this.yearFilter) : '';
    this.selectedSpecializations = this.parseSpecializationsFromQuery(
      params.getAll('specialization'),
      params.get('specialization')
    );
    this.searchKeyword = keyword?.trim() ?? '';
  }

  private syncFiltersToUrl(): void {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: this.buildResearchQueryParams(),
      queryParamsHandling: ''
    });
    this.location.replaceState(this.router.serializeUrl(tree));
  }

  private resetAndLoadPapers(): void {
    this.currentPage = 0;
    this.totalPaperCount = 0;
    this.allPapers = [];
    this.hasMorePapers = false;
    this.loadSpecializationCounts();
    this.loadPaperTypeCounts();
    this.loadRoleCounts();
    this.loadNextPage(true);
  }

  private loadNextPage(reset = false): void {
    if (this.isLoadingPapers) {
      return;
    }
    if (!reset && !this.hasMorePapers) {
      return;
    }

    this.isLoadingPapers = true;
    this.loadPapersPage(this.currentPage);
  }

  private updateViewportState(): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < this.mobileBreakpoint;
    this.isMobileViewport = isMobile;
  }

  private loadSpecializationCounts(): void {
    this.loadAllPapersForCounts({
      type: this.roleFilter,
      paperType: this.paperTypeFilter,
      specialization: null,
      year: this.yearFilter,
      q: this.searchKeyword,
      metric: null
    }).subscribe({
      next: (papers) => {
        const counts: Record<string, number> = {};
        for (const paper of papers) {
          const key = (paper.researchArea ?? '').trim() || 'Chưa phân loại';
          counts[key] = (counts[key] ?? 0) + 1;
        }
        this.specializationCounts = counts;
        this.cdr.detectChanges();
      },
      error: () => {
        this.specializationCounts = {};
      }
    });
  }

  private loadPaperTypeCounts(): void {
    this.loadAllPapersForCounts({
      type: this.roleFilter,
      paperType: null,
      specialization: this.selectedSpecializations,
      year: this.yearFilter,
      q: this.searchKeyword,
      metric: null
    }).subscribe({
      next: (papers) => {
        const counts: Record<'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS', number> = {
          SCIENTIFIC_RESEARCH: 0,
          GRADUATION_THESIS: 0
        };
        for (const paper of papers) {
          const key = paper.paperType === 'GRADUATION_THESIS' ? 'GRADUATION_THESIS' : 'SCIENTIFIC_RESEARCH';
          counts[key] += 1;
        }
        this.paperTypeCounts = counts;
        this.cdr.detectChanges();
      },
      error: () => {
        this.paperTypeCounts = {
          SCIENTIFIC_RESEARCH: 0,
          GRADUATION_THESIS: 0
        };
      }
    });
  }

  private loadRoleCounts(): void {
    this.loadAllPapersForCounts({
      type: null,
      paperType: this.paperTypeFilter,
      specialization: this.selectedSpecializations,
      year: this.yearFilter,
      q: this.searchKeyword,
      metric: null
    }).subscribe({
      next: (papers) => {
        const counts: Record<'LECTURER' | 'STUDENT', number> = {
          LECTURER: 0,
          STUDENT: 0
        };
        for (const paper of papers) {
          const key = paper.category === 'LECTURER' ? 'LECTURER' : 'STUDENT';
          counts[key] += 1;
        }
        this.roleCounts = counts;
        this.cdr.detectChanges();
      },
      error: () => {
        this.roleCounts = {
          LECTURER: 0,
          STUDENT: 0
        };
      }
    });
  }

  private loadAllPapersForCounts(query: ResearchPaperListQuery): Observable<ResearchPaper[]> {
    return this.researchPaperService.getPapersPage(query, 0, this.countPageSize).pipe(
      switchMap((firstPage) => {
        const totalPages = Math.max(firstPage.pageInfo?.totalPages ?? 0, 1);
        if (totalPages <= 1) {
          return of(firstPage.content ?? []);
        }

        const remainingRequests = Array.from({ length: totalPages - 1 }, (_, index) =>
          this.researchPaperService.getPapersPage(query, index + 1, this.countPageSize)
        );

        return forkJoin(remainingRequests).pipe(
          map((pages) => [firstPage, ...pages].flatMap((page) => page.content ?? []))
        );
      }),
      catchError(() => of([]))
    );
  }

  get availablePublicationYears(): number[] {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1;
    if (maxYear < 2025) {
      return [2025];
    }

    return Array.from({ length: maxYear - 2025 + 1 }, (_, index) => maxYear - index);
  }
}
