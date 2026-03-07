import { Component, OnInit, inject } from '@angular/core';
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
    <div class="min-h-screen bg-white">
      <div class="border-b border-gray-100 bg-blue-50/50 py-3 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <a routerLink="/research" class="text-hus-blue hover:text-hus-dark transition">Cổng nghiên cứu</a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">Tìm kiếm nâng cao</span>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
          <aside class="space-y-8">
            <section class="space-y-3">
              <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-900">Tìm kiếm</h2>
              <input
                [(ngModel)]="searchKeyword"
                type="text"
                placeholder="Tên bài viết, tác giả..."
                class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-hus-blue">
            </section>

            <section class="space-y-3">
              <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-900">Phân loại</h2>
              <button
                type="button"
                (click)="toggleCategoryPanel()"
                class="w-full bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between text-left">
                <span class="text-[11px] font-black uppercase tracking-widest text-hus-blue">Bài nghiên cứu</span>
                <span class="text-hus-blue font-black">{{ categoryPanelExpanded ? '-' : '+' }}</span>
              </button>

              <div *ngIf="categoryPanelExpanded" class="space-y-2 pl-4">
                <button
                  type="button"
                  (click)="setSpecializationFilter('ALL')"
                  class="block text-left text-[11px] font-bold uppercase tracking-wide transition-colors"
                  [class.text-hus-blue]="selectedSpecialization === 'ALL'"
                  [class.text-gray-800]="selectedSpecialization !== 'ALL'">
                  ▪ Tất cả
                </button>
                <button
                  type="button"
                  *ngFor="let category of specializations"
                  (click)="setSpecializationFilter(category.name)"
                  class="block text-left text-[11px] font-bold uppercase tracking-wide transition-colors"
                  [class.text-hus-blue]="selectedSpecialization === category.name"
                  [class.text-gray-800]="selectedSpecialization !== category.name">
                  ▪ {{ category.name }}
                </button>
              </div>
            </section>

            <section class="space-y-3">
              <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-900">Đối tượng</h2>
              <div class="space-y-2 pl-4">
                <button
                  type="button"
                  (click)="setRoleFilter('ALL')"
                  class="block text-left text-[11px] font-bold uppercase tracking-wide transition-colors"
                  [class.text-hus-blue]="roleFilter === 'ALL'"
                  [class.text-gray-800]="roleFilter !== 'ALL'">
                  ▪ Tất cả
                </button>
                <button
                  type="button"
                  (click)="setRoleFilter('LECTURER')"
                  class="block text-left text-[11px] font-bold uppercase tracking-wide transition-colors"
                  [class.text-hus-blue]="roleFilter === 'LECTURER'"
                  [class.text-gray-800]="roleFilter !== 'LECTURER'">
                  ▪ Giảng viên
                </button>
                <button
                  type="button"
                  (click)="setRoleFilter('STUDENT')"
                  class="block text-left text-[11px] font-bold uppercase tracking-wide transition-colors"
                  [class.text-hus-blue]="roleFilter === 'STUDENT'"
                  [class.text-gray-800]="roleFilter !== 'STUDENT'">
                  ▪ Sinh viên
                </button>
              </div>
            </section>

            <section class="pt-6 border-t border-gray-100 space-y-3">
              <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-400">Thao tác</h2>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  (click)="clearFilters()"
                  class="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
                  Xóa lọc
                </button>
                <button
                  type="button"
                  (click)="applyFilters()"
                  class="px-4 py-2 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors">
                  Áp dụng về trang chính
                </button>
              </div>
            </section>
          </aside>

          <section class="min-w-0 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Kết quả: <span class="text-hus-blue">{{ filteredPapers.length }}</span> bài nghiên cứu
              </p>
              <button
                type="button"
                (click)="backToResearch()"
                class="text-[10px] font-bold uppercase tracking-widest text-hus-blue hover:text-hus-dark transition-colors">
                Quay lại danh sách
              </button>
            </div>

            <div *ngIf="filteredPapers.length === 0"
                 class="min-h-[220px] border border-dashed border-gray-200 flex items-center justify-center">
              <p class="text-gray-400 text-2xl font-light uppercase tracking-widest">
                Không tìm thấy thông tin phù hợp.
              </p>
            </div>

            <div *ngIf="filteredPapers.length > 0" class="border border-gray-100 divide-y divide-gray-100">
              <button
                type="button"
                *ngFor="let paper of filteredPapers"
                (click)="openPaperDetail(paper.id)"
                class="w-full text-left p-5 hover:bg-blue-50/40 transition-colors">
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {{ paper.category === 'LECTURER' ? 'Giảng viên' : 'Sinh viên' }} · {{ paper.researchArea }} · {{ paper.publicationYear }}
                </p>
                <h3 class="mt-2 text-lg font-bold text-gray-900 leading-snug">{{ paper.title }}</h3>
                <p class="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  {{ getMainAuthorName(paper) }}
                </p>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  `
})
export class ResearchFilterComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly researchCategoryService = inject(ResearchCategoryService);
    private readonly researchPaperService = inject(ResearchPaperService);

    roleFilter: 'ALL' | 'LECTURER' | 'STUDENT' = 'ALL';
    selectedSpecialization = 'ALL';
    searchKeyword = '';
    categoryPanelExpanded = true;
    specializations: ResearchCategory[] = [];
    allPapers: ResearchPaper[] = [];

    ngOnInit(): void {
        const type = this.route.snapshot.queryParamMap.get('type');
        const specialization = this.route.snapshot.queryParamMap.get('specialization');
        const keyword = this.route.snapshot.queryParamMap.get('q');

        this.roleFilter = type === 'LECTURER' || type === 'STUDENT' ? type : 'ALL';
        this.selectedSpecialization = specialization?.trim() ? specialization : 'ALL';
        this.searchKeyword = keyword?.trim() ?? '';

        this.researchCategoryService.getActiveCategories().subscribe((items) => {
            this.specializations = items;
        });

        this.researchPaperService.getPapers().subscribe((papers) => {
            this.allPapers = papers;
        });
    }

    get filteredPapers(): ResearchPaper[] {
        const keyword = this.normalize(this.searchKeyword);
        return this.allPapers.filter((paper) => {
            if (this.roleFilter !== 'ALL' && paper.category !== this.roleFilter) {
                return false;
            }
            if (this.selectedSpecialization !== 'ALL' && paper.researchArea !== this.selectedSpecialization) {
                return false;
            }
            if (!keyword) {
                return true;
            }

            const haystack = this.normalize([
                paper.title,
                paper.researchArea,
                this.getMainAuthorName(paper)
            ].join(' '));
            return haystack.includes(keyword);
        });
    }

    setRoleFilter(value: 'ALL' | 'LECTURER' | 'STUDENT'): void {
        this.roleFilter = value;
    }

    setSpecializationFilter(value: string): void {
        this.selectedSpecialization = value || 'ALL';
    }

    toggleCategoryPanel(): void {
        this.categoryPanelExpanded = !this.categoryPanelExpanded;
    }

    clearFilters(): void {
        this.roleFilter = 'ALL';
        this.selectedSpecialization = 'ALL';
        this.searchKeyword = '';
    }

    applyFilters(): void {
        this.router.navigate(['/research'], {
            queryParams: {
                type: this.roleFilter !== 'ALL' ? this.roleFilter : null,
                specialization: this.selectedSpecialization !== 'ALL' ? this.selectedSpecialization : null,
                q: this.searchKeyword.trim() || null
            }
        });
    }

    backToResearch(): void {
        this.router.navigate(['/research']);
    }

    openPaperDetail(paperId: string): void {
        this.router.navigate(['/paper', paperId]);
    }

    getMainAuthorName(paper: ResearchPaper): string {
        const mainAuthor = paper.authors.find((author) => author.isMainAuthor) ?? paper.authors[0];
        return mainAuthor?.name ?? 'Unknown';
    }

    private normalize(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }
}
