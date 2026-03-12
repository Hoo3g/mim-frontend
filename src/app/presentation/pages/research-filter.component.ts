import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

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
                Tim kiem nghien cuu nang cao
              </h1>
              <p class="text-[10px] font-bold text-hus-blue uppercase tracking-widest pl-3">
                Loc bai nghien cuu theo doi tuong, phan loai va tu khoa
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
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Tim kiem</h3>
                <div class="relative">
                  <input
                    [(ngModel)]="searchKeyword"
                    (ngModelChange)="onSearchKeywordChange($event)"
                    type="text"
                    placeholder="Ten bai viet, tac gia..."
                    class="w-full bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:ring-1 focus:ring-hus-blue focus:border-hus-blue outline-none transition-all font-medium">
                </div>
              </section>

              <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Phan loai</h3>
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
                    Chua co phan loai
                  </div>
                </div>
              </section>

              <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Doi tuong</h3>
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
                    <span>Tat ca</span>
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
                    <span>Giang vien</span>
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
                    <span>Sinh vien</span>
                  </button>
                </div>
              </section>

              <section *ngIf="shouldShowFilterActions" class="pt-4 border-t border-gray-100">
                <div class="flex justify-center">
                  <button
                    type="button"
                    (click)="clearFilters()"
                    class="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
                    Xoa loc
                  </button>
                </div>
              </section>
            </div>
          </aside>

          <div class="flex-grow">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 md:mb-6">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Ket qua loc</p>
                <h2 class="text font-black text-gray-900 uppercase tracking-tight">
                  {{ filteredPapers.length }} bai nghien cuu phu hop
                </h2>
              </div>
            </div>

            <div
              *ngIf="filteredPapers.length === 0"
              class="py-14 md:py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
              Khong tim thay thong tin phu hop.
            </div>

            <div *ngIf="filteredPapers.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <button
                type="button"
                *ngFor="let paper of filteredPapers"
                (click)="openPaperDetail(paper.id)"
                class="bg-white border border-gray-100 p-6 hover:border-hus-blue hover:shadow-lg transition-all duration-300 group flex flex-col h-full relative cursor-pointer text-left">
                <div class="flex items-start justify-between mb-6">
                  <div class="flex items-center gap-4 min-w-0">
                    <div class="relative">
                      <div
                        class="w-11 h-11 flex-shrink-0 border-2 border-gray-50 shadow-sm overflow-hidden group-hover:border-hus-blue/20 transition-all duration-500 transform group-hover:scale-105"
                        [ngClass]="paper.category === 'LECTURER' ? 'bg-hus-blue' : 'bg-hus-gold'">
                        <div class="w-full h-full flex items-center justify-center text-[12px] font-black text-white uppercase">
                          {{ getAuthorInitials(getMainAuthorName(paper)) }}
                        </div>
                      </div>
                      <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white flex items-center justify-center border border-gray-50 shadow-sm">
                        <div class="w-1.5 h-1.5" [ngClass]="paper.category === 'LECTURER' ? 'bg-hus-blue' : 'bg-hus-gold'"></div>
                      </div>
                    </div>

                    <div class="flex flex-col min-w-0">
                      <div class="text-[13px] font-black text-gray-900 leading-tight mb-0.5 group-hover:text-hus-blue transition-colors truncate">
                        {{ getMainAuthorName(paper) }}
                      </div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span
                          class="text-[7.5px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                          [ngClass]="paper.category === 'LECTURER' ? 'text-hus-blue bg-blue-50/50' : 'text-hus-gold bg-amber-50'">
                          {{ paper.category === 'LECTURER' ? 'Giang vien' : 'Sinh vien' }}
                        </span>
                        <span class="text-[8px] font-bold uppercase tracking-widest text-gray-300">
                          {{ paper.researchArea || 'Chua phan loai' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-1">
                    <span class="text-[9px] font-bold text-gray-300 uppercase tabular-nums">{{ paper.publicationYear }}</span>
                    <div class="w-4 h-0.5 bg-gray-100 group-hover:bg-hus-blue/30 transition-colors"></div>
                  </div>
                </div>

                <h3 class="text-base font-bold text-gray-900 mb-2 leading-tight group-hover:translate-x-1 transition-all duration-300 line-clamp-2 min-h-[2.5rem]">
                  {{ paper.title }}
                </h3>

                <p class="text-[11px] text-gray-500 font-light leading-relaxed mb-4 line-clamp-3 whitespace-pre-line">
                  {{ getAbstractPreview(paper.abstract) || 'Bai nghien cuu chua co phan tom tat.' }}
                </p>

                <div class="space-y-4 mb-2 flex-grow">
                  <div class="pt-3 border-t border-gray-50">
                    <h4 class="text-[8px] font-bold text-hus-blue uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span class="w-1 h-1 bg-hus-blue"></span>
                      Tac gia tham gia
                    </h4>
                    <p class="text-[10px] text-gray-600 leading-relaxed font-medium line-clamp-2">
                      {{ paper.authors.length }} tac gia · {{ getSecondaryAuthorSummary(paper) }}
                    </p>
                  </div>

                  <div *ngIf="paper.journalConference" class="pt-3 border-t border-gray-50">
                    <h4 class="text-[8px] font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span class="w-1 h-1 bg-gray-900"></span>
                      Noi cong bo
                    </h4>
                    <p class="text-[10px] text-gray-600 leading-relaxed font-medium line-clamp-2">
                      {{ paper.journalConference }}
                    </p>
                  </div>
                </div>

                <div class="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h6m-6 4h10M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
                      </svg>
                      <span>{{ paper.researchArea || 'Chua phan loai' }}</span>
                    </div>
                    <div class="flex items-center gap-1 text-[9px] font-bold text-hus-blue uppercase tracking-widest">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
                      </svg>
                      <span>{{ paper.publicationYear }}</span>
                    </div>
                  </div>
                  <div class="text-[8px] font-black text-gray-200 uppercase tracking-widest group-hover:text-hus-blue transition-colors">Chi tiet</div>
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
  private readonly researchCategoryService = inject(ResearchCategoryService);
  private readonly researchPaperService = inject(ResearchPaperService);

  roleFilter: 'ALL' | 'LECTURER' | 'STUDENT' = 'ALL';
  selectedSpecializations: string[] = [];
  searchKeyword = '';
  isLoadingSpecializations = true;
  specializations: ResearchCategory[] = [];
  allPapers: ResearchPaper[] = [];

  ngOnInit(): void {
    const type = this.route.snapshot.queryParamMap.get('type');
    const keyword = this.route.snapshot.queryParamMap.get('q');

    this.roleFilter = type === 'LECTURER' || type === 'STUDENT' ? type : 'ALL';
    this.selectedSpecializations = this.parseSpecializationsFromQuery();
    this.searchKeyword = keyword?.trim() ?? '';

    this.researchCategoryService.getActiveCategories().subscribe((items) => {
      this.specializations = items;
      this.isLoadingSpecializations = false;
      this.cdr.detectChanges();
    });

    this.researchPaperService.getPapers().subscribe((papers) => {
      this.allPapers = papers;
      this.cdr.detectChanges();
    });
  }

  get filteredPapers(): ResearchPaper[] {
    const keyword = this.normalize(this.searchKeyword);
    return this.allPapers.filter((paper) => {
      if (this.roleFilter !== 'ALL' && paper.category !== this.roleFilter) {
        return false;
      }
      if (this.selectedSpecializations.length > 0 && !this.selectedSpecializations.includes(paper.researchArea)) {
        return false;
      }
      if (!keyword) {
        return true;
      }

      const haystack = this.normalize([
        paper.title,
        this.getAbstractPreview(paper.abstract),
        paper.researchArea,
        paper.journalConference ?? '',
        this.getMainAuthorName(paper)
      ].join(' '));
      return haystack.includes(keyword);
    });
  }

  get shouldShowFilterActions(): boolean {
    return this.roleFilter !== 'ALL'
      || this.selectedSpecializations.length > 0
      || !!this.searchKeyword.trim();
  }

  onSearchKeywordChange(value: string): void {
    this.searchKeyword = value;
  }

  setRoleFilter(value: 'ALL' | 'LECTURER' | 'STUDENT'): void {
    this.roleFilter = value;
  }

  toggleSpecializationFilter(value: string): void {
    const normalizedValue = (value ?? '').trim();
    if (!normalizedValue) {
      return;
    }

    if (this.selectedSpecializations.includes(normalizedValue)) {
      this.selectedSpecializations = this.selectedSpecializations.filter((item) => item !== normalizedValue);
      return;
    }

    this.selectedSpecializations = [...this.selectedSpecializations, normalizedValue];
  }

  isSpecializationSelected(value: string): boolean {
    return this.selectedSpecializations.includes((value ?? '').trim());
  }

  clearFilters(): void {
    this.roleFilter = 'ALL';
    this.selectedSpecializations = [];
    this.searchKeyword = '';
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

  getAuthorInitials(name: string): string {
    const source = (name ?? '').trim();
    if (!source) {
      return 'U';
    }

    const parts = source.split(/\s+/).filter((item) => !!item);
    return parts.slice(0, 2).map((item) => item.charAt(0)).join('').toUpperCase();
  }

  getSecondaryAuthorSummary(paper: ResearchPaper): string {
    const authors = paper.authors
      .map((author) => author.name?.trim())
      .filter((name): name is string => !!name);

    if (authors.length === 0) {
      return 'Chua co thong tin tac gia';
    }

    if (authors.length === 1) {
      return authors[0];
    }

    return authors.slice(0, 2).join(', ');
  }

  getAbstractPreview(html: string): string {
    const value = (html ?? '').trim();
    if (!value) {
      return '';
    }

    if (typeof document === 'undefined') {
      return value;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = value;

    const lines: string[] = [];
    const appendLine = (text: string): void => {
      const normalized = text.replace(/\u00A0/g, ' ').replace(/[ \t]+/g, ' ').trim();
      if (normalized) {
        lines.push(normalized);
      }
    };

    const walk = (node: Node, orderedIndex = { value: 1 }): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent ?? '';
      }

      if (!(node instanceof HTMLElement)) {
        return '';
      }

      const tag = node.tagName.toLowerCase();

      if (tag === 'br') {
        return '\n';
      }

      if (tag === 'li') {
        const parentTag = node.parentElement?.tagName.toLowerCase();
        const prefix = parentTag === 'ol' ? `${orderedIndex.value++}. ` : '- ';
        const content = Array.from(node.childNodes).map((child) => walk(child)).join('').trim();
        return `${prefix}${content}\n`;
      }

      if (tag === 'ol') {
        const index = { value: 1 };
        return Array.from(node.childNodes).map((child) => walk(child, index)).join('');
      }

      if (tag === 'ul') {
        return Array.from(node.childNodes).map((child) => walk(child)).join('');
      }

      const content = Array.from(node.childNodes).map((child) => walk(child, orderedIndex)).join('');
      if (['p', 'div', 'section', 'article'].includes(tag)) {
        return `${content}\n`;
      }

      return content;
    };

    Array.from(wrapper.childNodes).forEach((node) => {
      walk(node)
        .split('\n')
        .forEach((line) => appendLine(line));
    });

    return lines.join('\n');
  }

  private parseSpecializationsFromQuery(): string[] {
    const specializations = this.route.snapshot.queryParamMap.getAll('specialization');
    if (specializations.length > 0) {
      return specializations
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter((item, index, arr) => !!item && arr.indexOf(item) === index);
    }

    const fallback = this.route.snapshot.queryParamMap.get('specialization');
    if (!fallback?.trim()) {
      return [];
    }

    return fallback
      .split(',')
      .map((item) => item.trim())
      .filter((item, index, arr) => !!item && arr.indexOf(item) === index);
  }

  private buildResearchQueryParams(): { type: 'LECTURER' | 'STUDENT' | null; specialization: string[] | null; q: string | null } {
    return {
      type: this.roleFilter !== 'ALL' ? this.roleFilter : null,
      specialization: this.selectedSpecializations.length > 0 ? this.selectedSpecializations : null,
      q: this.searchKeyword.trim() || null
    };
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
