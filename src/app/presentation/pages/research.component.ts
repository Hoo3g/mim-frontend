import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ResearchPaperService } from '../../core/services/research-paper.service';
import { ResearchPaper } from '../../core/models/research-paper.model';
import { Observable, map } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ResearchHeroContent } from '../../core/models/content.model';
import { NewsService } from '../../core/services/news.service';
import { NewsItem } from '../../core/models/news.model';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent],
  template: `
    <div class="bg-white min-h-screen">
      
      <!-- Hero Banner Section -->
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4">
          <div *ngIf="hero$ | async as hero" class="relative overflow-hidden border-2 border-hus-blue/10 bg-white">
            <div class="md:hidden relative h-[280px] sm:h-[320px] overflow-hidden">
              <img [src]="hero.imageUrl"
                   alt="MIM Faculty Building"
                   class="absolute inset-0 w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-white/20"></div>
              <div class="absolute inset-x-0 bottom-0 p-4">
                <h1 class="text-[32px] leading-[0.95] font-black text-gray-900 uppercase tracking-tighter">
                  {{ hero.titlePrefix }}<br/>
                  <span class="text-hus-blue">{{ hero.titleHighlight }}</span>
                </h1>
                <p class="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-[22rem]">
                  {{ hero.subtitle }}
                </p>
                <div class="mt-3 flex gap-3 items-center">
                  <div class="h-7 w-1 bg-hus-blue"></div>
                  <div class="flex flex-col justify-center">
                    <span class="text-[10px] font-bold text-gray-900 uppercase tracking-widest leading-none">HUS - VNU</span>
                    <span class="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">ESTABLISHED 1956</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="hidden md:grid grid-cols-2 items-center">
              <div class="p-4 md:p-6">
                <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-2 uppercase tracking-tighter">
                  {{ hero.titlePrefix }} <br/>
                  <span class="text-hus-blue">{{ hero.titleHighlight }}</span>
                </h1>
                <p class="text-[11px] text-gray-400 font-bold uppercase tracking-widest max-w-sm mb-4">
                  {{ hero.subtitle }}
                </p>
                <div class="flex gap-4">
                  <div class="h-7 w-1 bg-hus-blue"></div>
                  <div class="flex flex-col justify-center">
                    <span class="text-[10px] font-bold text-gray-900 uppercase tracking-widest leading-none">HUS - VNU</span>
                    <span class="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">ESTABLISHED 1956</span>
                  </div>
                </div>
              </div>
              <div class="h-40 md:h-full relative overflow-hidden bg-gray-100">
                <img [src]="hero.imageUrl" alt="MIM Faculty Building" class="w-full h-full object-cover grayscale-0 hover:scale-105 transition-transform duration-700">
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-10">

          <!-- LEFT: Research Index -->
          <section class="min-w-0">
            <div class="flex items-center justify-between gap-3 mb-6 pb-2 border-b-2 border-hus-blue">
              <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <span class="w-1 h-4 bg-hus-blue"></span>
                Nghiên cứu khoa học
              </h2>
              <button type="button"
                      (click)="openFilterPage()"
                      class="inline-flex items-center gap-2 px-3 h-10 border border-gray-200 text-gray-500 hover:border-hus-blue hover:text-hus-blue transition-colors"
                      aria-label="Mở bộ lọc nâng cao"
                      title="Bộ lọc nâng cao">
                <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"></path>
                </svg>
                <span class="text-[10px] font-bold uppercase tracking-widest">Tìm kiếm</span>
              </button>
            </div>

            <div *ngIf="(filteredPapers$ | async) as papers; else loading">
              <div *ngIf="papers.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
                Không tìm thấy dữ liệu.
              </div>
              
              <div class="divide-y divide-gray-100">
                <div *ngFor="let paper of papers | slice:0:visiblePaperCount"
                     class="py-6 md:py-8 first:pt-4 group cursor-pointer"
                     (click)="navigateToDetail(paper.id)">
                   
                   <div class="flex items-start gap-4 md:gap-6">
                     <!-- Minimal Category Indicator - Using HUS Blue for prominence -->
                     <div class="flex-shrink-0 w-8 h-8 border border-gray-100 flex items-center justify-center text-[10px] font-bold transition-all"
                          [ngClass]="paper.category === 'LECTURER' ? 'bg-hus-blue text-white' : 'bg-hus-gold text-white'">
                       {{ paper.category === 'LECTURER' ? 'GV' : 'SV' }}
                     </div>

                     <div class="flex-grow min-w-0">
                        <div class="flex items-center justify-between gap-3 mb-2">
                          <div class="flex items-center gap-2 md:gap-3 flex-wrap min-w-0">
                            <span class="text-[10px] font-bold text-gray-900 uppercase tracking-tighter truncate max-w-[9rem] sm:max-w-none">{{ getMainAuthor(paper) }}</span>
                            <span class="h-1 w-1 bg-gray-200 rounded-full"></span>
                            <span class="text-[10px] font-medium text-hus-blue uppercase tracking-tighter truncate max-w-[8rem] sm:max-w-none">{{ paper.researchArea }}</span>
                            <span class="h-1 w-1 bg-gray-200 rounded-full"></span>
                            <span class="text-[10px] font-medium text-gray-400 uppercase tabular-nums">{{ paper.publicationYear }}</span>
                          </div>
                        </div>

                        <h3 class="text-lg sm:text-xl font-bold text-gray-900 leading-tight group-hover:text-hus-blue transition-all">
                          {{ paper.title }}
                        </h3>

                        <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-gray-400 tracking-widest">
                          <span class="inline-flex items-center gap-1.5" title="Lượt xem">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span class="tabular-nums">1245</span>
                          </span>
                          <span class="inline-flex items-center gap-1.5" title="Lượt tải xuống">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M7 10l5 5m0 0 5-5m-5 5V3" />
                            </svg>
                            <span class="tabular-nums">32</span>
                          </span>
                          <span class="inline-flex items-center gap-1.5" title="Đã lưu">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            <span class="tabular-nums">5</span>
                          </span>
                        </div>
                     </div>
                   </div>
                </div>
              </div>

              <div *ngIf="papers.length > visiblePaperCount" class="pt-8 flex justify-end">
                <button type="button"
                        (click)="loadMorePapers()"
                        class="inline-flex items-center justify-center gap-2 min-w-[86px] text-hus-blue text-base font-bold hover:text-hus-dark transition-colors">
                  <span>Xem thêm bài</span>
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            </div>

            <ng-template #loading>
              <app-loading-spinner [size]="52"></app-loading-spinner>
            </ng-template>
          </section>

          <!-- RIGHT: Sidebar - Bulletins (hidden on mobile, moved to hamburger menu) -->
           <aside class="hidden md:block bg-white border border-gray-100 p-5 md:p-6 space-y-8 md:space-y-12 self-start">
             <section>
               <div class="flex items-center justify-between gap-3 mb-6 pb-2 border-b-2 border-hus-blue">
                 <h3 class="text-[10px] font-bold text-hus-blue uppercase tracking-widest">
                   Bảng tin Khoa
                 </h3>
                 <a routerLink="/news"
                    class="text-[10px] font-bold uppercase tracking-widest text-hus-blue hover:text-hus-dark transition-colors">
                   Xem tất cả
                 </a>
               </div>
               <div *ngIf="(news$ | async) as newsItems; else newsLoading">
                 <div *ngIf="newsItems.length === 0"
                      class="text-[10px] text-gray-400 uppercase tracking-widest border border-dashed border-gray-100 px-3 py-4">
                   Chưa có bản tin.
                 </div>
                 <div *ngIf="newsItems.length > 0" class="space-y-8">
                   <a *ngFor="let item of newsItems | slice:0:6"
                      [routerLink]="['/news', item.id]"
                      class="block group cursor-pointer">
                     <p class="text-[9px] font-bold text-hus-blue opacity-50 mb-2 font-mono tabular-nums">{{ item.createdAt | date:'dd.MM.yyyy' }}</p>
                     <h4 class="text-xs font-bold text-gray-700 leading-normal group-hover:text-hus-blue transition-colors">
                       {{ item.title }}
                     </h4>
                     <div class="mt-2 text-[10px] text-hus-blue opacity-0 group-hover:opacity-100 transition-opacity font-bold">Xem chi tiết &rarr;</div>
                   </a>
                 </div>
               </div>
               <ng-template #newsLoading>
                <app-loading-spinner
                  [compact]="true"
                  [size]="40">
                </app-loading-spinner>
               </ng-template>
             </section>

             <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-6 opacity-30">
                  Liên kết
                </h3>
                <ul class="text-[10px] space-y-2 font-bold text-gray-400 uppercase tracking-tighter">
                  <li><a href="#" class="hover:text-hus-blue transition underline underline-offset-2">Đào tạo Đại học</a></li>
                  <li><a href="#" class="hover:text-hus-blue transition underline underline-offset-2">Lịch công tác</a></li>
                  <li><a href="#" class="hover:text-hus-blue transition underline underline-offset-2">Phòng thí nghiệm</a></li>
                </ul>
             </section>
           </aside>

        </div>
      </div>
    </div>
  `
})
export class ResearchComponent implements OnInit {
  private paperService = inject(ResearchPaperService);
  private contentService = inject(ContentService);
  private newsService = inject(NewsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  allPapers$!: Observable<ResearchPaper[]>;
  filteredPapers$!: Observable<ResearchPaper[]>;
  news$!: Observable<NewsItem[]>;
  hero$!: Observable<ResearchHeroContent>;
  currentFilter: 'ALL' | 'LECTURER' | 'STUDENT' = 'ALL';
  selectedSpecializations: string[] = [];
  searchKeyword = '';
  visiblePaperCount = 6;
  private readonly pageSize = 6;

  ngOnInit(): void {
    this.hero$ = this.contentService.getResearchHeroContent();
    this.reloadPapers();
    this.news$ = this.newsService.getPublicNews();
    this.route.queryParamMap.subscribe((params) => {
      const type = params.get('type');
      const keyword = params.get('q');
      this.currentFilter = type === 'LECTURER' || type === 'STUDENT' ? type : 'ALL';
      this.selectedSpecializations = this.parseSpecializationsFromParams(params.getAll('specialization'), params.get('specialization'));
      this.searchKeyword = keyword?.trim() ?? '';
      this.resetVisiblePapers();
      this.updateFilter();
    });
  }

  private updateFilter(): void {
    this.filteredPapers$ = this.allPapers$.pipe(
      map(papers => {
        let filtered = papers;
        if (this.currentFilter !== 'ALL') {
          filtered = filtered.filter(p => p.category === this.currentFilter);
        }
        if (this.selectedSpecializations.length > 0) {
          filtered = filtered.filter((p) => this.selectedSpecializations.includes(p.researchArea));
        }
        if (this.searchKeyword) {
          const normalizedKeyword = this.normalize(this.searchKeyword);
          filtered = filtered.filter((paper) => {
            const searchable = this.normalize([
              paper.title,
              paper.researchArea,
              this.getMainAuthor(paper)
            ].join(' '));
            return searchable.includes(normalizedKeyword);
          });
        }
        return filtered;
      })
    );
  }

  navigateToDetail(id: string): void {
    this.router.navigate(['/paper', id]);
  }

  openFilterPage(): void {
    this.router.navigate(['/research/filter'], {
      queryParams: {
        type: this.currentFilter !== 'ALL' ? this.currentFilter : null,
        specialization: this.selectedSpecializations.length > 0 ? this.selectedSpecializations : null,
        q: this.searchKeyword || null
      },
      queryParamsHandling: ''
    });
  }

  loadMorePapers(): void {
    this.visiblePaperCount += this.pageSize;
  }

  getMainAuthor(paper: ResearchPaper): string {
    const main = paper.authors.find(a => a.isMainAuthor) || paper.authors[0];
    return main ? main.name : 'Unknown';
  }

  private reloadPapers(): void {
    this.resetVisiblePapers();
    this.allPapers$ = this.paperService.getPapers();
    this.updateFilter();
  }

  private resetVisiblePapers(): void {
    this.visiblePaperCount = this.pageSize;
  }

  private parseSpecializationsFromParams(values: string[], fallback: string | null): string[] {
    if (values.length > 0) {
      return values
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

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

}
