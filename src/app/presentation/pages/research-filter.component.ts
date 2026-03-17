import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { ResearchCategory } from '../../core/models/research-category.model';
import { ResearchPaper } from '../../core/models/research-paper.model';
import { ResearchCategoryService } from '../../core/services/research-category.service';
import { ResearchPaperService } from '../../core/services/research-paper.service';

@Component({
  selector: 'app-research-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bg-white min-h-screen">
      <div class="border-b border-gray-100 bg-blue-50/10 py-5 md:py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
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
                    class="w-full bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:ring-1 focus:ring-hus-blue focus:border-hus-blue outline-none transition-all font-medium">
                </div>
              </section>

              <div class="overflow-hidden border border-gray-100 bg-white lg:overflow-visible lg:border-0 lg:bg-transparent lg:space-y-4">
                <section class="bg-white border-t border-gray-100 first:border-t-0 lg:border lg:border-gray-100">
                  <button
                    type="button"
                    (click)="toggleMobileSection('specializations')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue/10 border-b border-hus-blue/20">
                    <h3 class="text-[10px] font-bold text-hus-blue uppercase tracking-widest">Phân loại</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-hus-blue/70 leading-none min-w-[1rem] text-right">
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
                        class="w-3.5 h-3.5 border transition-colors flex items-center justify-center"
                        [ngClass]="isSpecializationSelected(category.name) ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
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
                      <span class="break-words">{{ category.name }}</span>
                    </button>
                    <div
                      *ngIf="specializations.length === 0"
                      class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 border border-dashed border-gray-100">
                      Chưa có phân loại
                    </div>
                  </div>
                </section>

                <section class="bg-white border-t border-gray-100 first:border-t-0 lg:border lg:border-gray-100">
                  <button
                    type="button"
                    (click)="toggleMobileSection('metrics')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue/10 border-b border-hus-blue/20">
                    <h3 class="text-[10px] font-bold text-hus-blue uppercase tracking-widest">Mức độ quan tâm</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-hus-blue/70 leading-none min-w-[1rem] text-right">
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
                        class="w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center"
                        [ngClass]="metricSort === 'views' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
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
                        class="w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center"
                        [ngClass]="metricSort === 'downloads' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
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
                        class="w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center"
                        [ngClass]="metricSort === 'bookmarks' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
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

                <section class="bg-white border-t border-gray-100 first:border-t-0 lg:border lg:border-gray-100">
                  <button
                    type="button"
                    (click)="toggleMobileSection('roles')"
                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue/10 border-b border-hus-blue/20">
                    <h3 class="text-[10px] font-bold text-hus-blue uppercase tracking-widest">Đối tượng</h3>
                    <span *ngIf="isMobileViewport"
                          class="text-sm font-black text-hus-blue/70 leading-none min-w-[1rem] text-right">
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
                        class="w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center"
                        [ngClass]="roleFilter === 'LECTURER' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
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
                      <span>Giảng viên</span>
                    </button>
                    <button
                      type="button"
                      (click)="setRoleFilter('STUDENT')"
                      [class.text-hus-blue]="roleFilter === 'STUDENT'"
                      [class.bg-blue-50]="roleFilter === 'STUDENT'"
                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <span
                        class="w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center"
                        [ngClass]="roleFilter === 'STUDENT' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
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
                      <span>Sinh viên</span>
                    </button>
                  </div>
                </section>
              </div>

              <section *ngIf="shouldShowFilterActions" class="pt-4 border-t border-gray-100">
                <div class="flex justify-center">
                  <button
                    type="button"
                    (click)="clearFilters()"
                    class="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
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
                  {{ filteredPapers.length }} bài nghiên cứu phù hợp
                </h2>
              </div>
            </div>

            <div
              *ngIf="filteredPapers.length === 0"
              class="py-14 md:py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
              Không tìm thấy thông tin phù hợp.
            </div>

            <div *ngIf="filteredPapers.length > 0" class="border border-gray-100 bg-white">
              <button
                type="button"
                *ngFor="let paper of filteredPapers | slice:0:visiblePaperCount"
                (click)="openPaperDetail(paper.id)"
                class="w-full px-5 py-5 sm:px-6 sm:py-6 border-b border-gray-100 last:border-b-0 text-left hover:bg-blue-50/40 transition-colors group">
                <div class="flex items-start gap-4">
                  <div class="min-w-0 flex-1">
                    <h3 class="text-base sm:text-lg font-bold text-gray-900 leading-7 group-hover:text-hus-blue transition-colors">
                      {{ paper.title }}
                    </h3>

                    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span>{{ getMainAuthorName(paper) }}</span>
                      <span class="text-gray-300">•</span>
                      <span>{{ paper.category === 'LECTURER' ? 'Giảng viên' : 'Sinh viên' }}</span>
                      <span class="text-gray-300">•</span>
                      <span>{{ paper.researchArea || 'Chưa phân loại' }}</span>
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

                  <div class="hidden sm:block pt-1 text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:text-hus-blue transition-colors whitespace-nowrap">
                    Chi tiết
                  </div>
                </div>
              </button>
            </div>

            <div *ngIf="filteredPapers.length > visiblePaperCount" class="pt-8 flex justify-center">
              <button
                type="button"
                (click)="loadMorePapers()"
                class="inline-flex items-center justify-center gap-2 min-w-[110px] border border-gray-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-hus-blue hover:border-hus-blue hover:bg-blue-50/40 transition-colors">
                <span>Xem thêm</span>
                <span aria-hidden="true">+</span>
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly researchCategoryService = inject(ResearchCategoryService);
  private readonly researchPaperService = inject(ResearchPaperService);
  private readonly searchKeywordChanges = new Subject<string>();
  private readonly mobileBreakpoint = 768;

  roleFilter: 'LECTURER' | 'STUDENT' | null = null;
  metricSort: 'views' | 'downloads' | 'bookmarks' | null = null;
  selectedSpecializations: string[] = [];
  searchKeyword = '';
  isLoadingSpecializations = true;
  specializations: ResearchCategory[] = [];
  allPapers: ResearchPaper[] = [];
  visiblePaperCount = 10;
  isMobileViewport = false;
  mobileSectionsOpen: Record<'specializations' | 'metrics' | 'roles', boolean> = {
    specializations: false,
    metrics: false,
    roles: false
  };
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
        this.syncFiltersToUrl();
      });

    this.researchCategoryService.getActiveCategories().subscribe((items) => {
      this.specializations = items;
      this.isLoadingSpecializations = false;
      this.cdr.detectChanges();
    });

    this.route.queryParamMap.subscribe((params) => {
      const type = params.get('type');
      const keyword = params.get('q');
      const metric = params.get('metric');

      this.roleFilter = type === 'LECTURER' || type === 'STUDENT' ? type : null;
      this.metricSort = metric === 'views' || metric === 'downloads' || metric === 'bookmarks' ? metric : null;
      this.selectedSpecializations = this.parseSpecializationsFromQuery(
        params.getAll('specialization'),
        params.get('specialization')
      );
      this.searchKeyword = keyword?.trim() ?? '';
      this.resetVisiblePapers();
      this.loadPapers();
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  get filteredPapers(): ResearchPaper[] {
    const papers = [...this.allPapers];

    switch (this.metricSort) {
      case 'views':
        return papers.sort((left, right) =>
          right.viewCount - left.viewCount || right.createdAt.getTime() - left.createdAt.getTime());
      case 'downloads':
        return papers.sort((left, right) =>
          right.downloadCount - left.downloadCount || right.createdAt.getTime() - left.createdAt.getTime());
      case 'bookmarks':
        return papers.sort((left, right) =>
          right.bookmarkCount - left.bookmarkCount || right.createdAt.getTime() - left.createdAt.getTime());
      default:
        return papers;
    }
  }

  get shouldShowFilterActions(): boolean {
    return this.roleFilter !== null
      || this.metricSort !== null
      || this.selectedSpecializations.length > 0
      || !!this.searchKeyword.trim();
  }

  onSearchKeywordChange(value: string): void {
    this.searchKeyword = value;
    this.searchKeywordChanges.next(value.trim());
  }

  setRoleFilter(value: 'LECTURER' | 'STUDENT'): void {
    this.roleFilter = value;
    this.syncFiltersToUrl();
  }

  setMetricSort(value: 'views' | 'downloads' | 'bookmarks'): void {
    this.metricSort = value;
    this.syncFiltersToUrl();
  }

  toggleSpecializationFilter(value: string): void {
    const normalizedValue = (value ?? '').trim();
    if (!normalizedValue) {
      return;
    }

    if (this.selectedSpecializations.includes(normalizedValue)) {
      this.selectedSpecializations = this.selectedSpecializations.filter((item) => item !== normalizedValue);
      this.syncFiltersToUrl();
      return;
    }

    this.selectedSpecializations = [...this.selectedSpecializations, normalizedValue];
    this.syncFiltersToUrl();
  }

  isSpecializationSelected(value: string): boolean {
    return this.selectedSpecializations.includes((value ?? '').trim());
  }

  shouldShowSection(section: 'specializations' | 'metrics' | 'roles'): boolean {
    return !this.isMobileViewport || this.mobileSectionsOpen[section];
  }

  toggleMobileSection(section: 'specializations' | 'metrics' | 'roles'): void {
    if (!this.isMobileViewport) {
      return;
    }

    this.mobileSectionsOpen[section] = !this.mobileSectionsOpen[section];
  }

  isMobileSectionOpen(section: 'specializations' | 'metrics' | 'roles'): boolean {
    return this.mobileSectionsOpen[section];
  }

  clearFilters(): void {
    this.roleFilter = null;
    this.metricSort = null;
    this.selectedSpecializations = [];
    this.searchKeyword = '';
    this.syncFiltersToUrl();
  }

  loadMorePapers(): void {
    this.visiblePaperCount += this.pageSize;
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

  private loadPapers(): void {
    this.researchPaperService.getPapers({
      type: this.roleFilter,
      specialization: this.selectedSpecializations,
      q: this.searchKeyword
    }).subscribe((papers) => {
      this.allPapers = papers;
      this.cdr.detectChanges();
    });
  }

  private syncFiltersToUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildResearchQueryParams(),
      queryParamsHandling: '',
      replaceUrl: true
    });
  }

  private buildResearchQueryParams(): {
    type: 'LECTURER' | 'STUDENT' | null;
    metric: 'views' | 'downloads' | 'bookmarks' | null;
    specialization: string[] | null;
    q: string | null;
  } {
    return {
      type: this.roleFilter,
      metric: this.metricSort,
      specialization: this.selectedSpecializations.length > 0 ? this.selectedSpecializations : null,
      q: this.searchKeyword.trim() || null
    };
  }

  private resetVisiblePapers(): void {
    this.visiblePaperCount = this.pageSize;
  }

  private updateViewportState(): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < this.mobileBreakpoint;
    this.isMobileViewport = isMobile;
  }
}
