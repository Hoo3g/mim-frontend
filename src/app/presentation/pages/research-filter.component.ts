import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
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
            <div class="space-y-6 md:space-y-8 lg:sticky" [style.top]="'var(--app-nav-sidebar-offset, 124px)'">
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

              <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Phân loại</h3>
                <div *ngIf="isLoadingSpecializations" class="space-y-2">
                  <div *ngFor="let item of [1, 2, 3, 4]" class="h-9 border border-gray-100 bg-gray-50 animate-pulse"></div>
                </div>

                <div *ngIf="!isLoadingSpecializations" class="space-y-2">
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

              <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Đối tượng</h3>
                <div class="space-y-2">
                  <button
                    type="button"
                    (click)="setRoleFilter('ALL')"
                    [class.text-hus-blue]="roleFilter === 'ALL'"
                    [class.bg-blue-50]="roleFilter === 'ALL'"
                    class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                    <span
                      class="w-3.5 h-3.5 rounded-full border transition-colors flex items-center justify-center"
                      [ngClass]="roleFilter === 'ALL' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
                      <svg
                        *ngIf="roleFilter === 'ALL'"
                        viewBox="0 0 12 12"
                        class="w-2.5 h-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true">
                        <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
                      </svg>
                    </span>
                    <span>Tất cả</span>
                  </button>
                  <button
                    type="button"
                    (click)="setRoleFilter('LECTURER')"
                    [class.text-hus-blue]="roleFilter === 'LECTURER'"
                    [class.bg-blue-50]="roleFilter === 'LECTURER'"
                    class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
                    <span
                      class="w-3.5 h-3.5 rounded-full border transition-colors flex items-center justify-center"
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
                      class="w-3.5 h-3.5 rounded-full border transition-colors flex items-center justify-center"
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
                *ngFor="let paper of filteredPapers"
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
                  </div>

                  <div class="hidden sm:block pt-1 text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:text-hus-blue transition-colors whitespace-nowrap">
                    Chi tiết
                  </div>
                </div>
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

  roleFilter: 'ALL' | 'LECTURER' | 'STUDENT' = 'ALL';
  selectedSpecializations: string[] = [];
  searchKeyword = '';
  isLoadingSpecializations = true;
  specializations: ResearchCategory[] = [];
  allPapers: ResearchPaper[] = [];

  ngOnInit(): void {
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

      this.roleFilter = type === 'LECTURER' || type === 'STUDENT' ? type : 'ALL';
      this.selectedSpecializations = this.parseSpecializationsFromQuery(
        params.getAll('specialization'),
        params.get('specialization')
      );
      this.searchKeyword = keyword?.trim() ?? '';
      this.loadPapers();
    });
  }

  get filteredPapers(): ResearchPaper[] {
    return this.allPapers;
  }

  get shouldShowFilterActions(): boolean {
    return this.roleFilter !== 'ALL'
      || this.selectedSpecializations.length > 0
      || !!this.searchKeyword.trim();
  }

  onSearchKeywordChange(value: string): void {
    this.searchKeyword = value;
    this.searchKeywordChanges.next(value.trim());
  }

  setRoleFilter(value: 'ALL' | 'LECTURER' | 'STUDENT'): void {
    this.roleFilter = value;
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

  clearFilters(): void {
    this.roleFilter = 'ALL';
    this.selectedSpecializations = [];
    this.searchKeyword = '';
    this.syncFiltersToUrl();
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

  private buildResearchQueryParams(): { type: 'LECTURER' | 'STUDENT' | null; specialization: string[] | null; q: string | null } {
    return {
      type: this.roleFilter !== 'ALL' ? this.roleFilter : null,
      specialization: this.selectedSpecializations.length > 0 ? this.selectedSpecializations : null,
      q: this.searchKeyword.trim() || null
    };
  }
}
