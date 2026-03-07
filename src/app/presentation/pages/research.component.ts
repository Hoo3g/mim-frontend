import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ResearchPaperService } from '../../core/services/research-paper.service';
import { ResearchPaper } from '../../core/models/research-paper.model';
import { Observable, map } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ResearchHeroContent } from '../../core/models/content.model';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-white min-h-screen">
      
      <!-- Hero Banner Section -->
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div *ngIf="hero$ | async as hero" class="relative overflow-hidden border-2 border-hus-blue/10 bg-white">
            <div class="grid grid-cols-1 md:grid-cols-2 items-center">
              <div class="p-8 md:p-12">
                <h1 class="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4 uppercase tracking-tighter">
                  {{ hero.titlePrefix }} <br/>
                  <span class="text-hus-blue">{{ hero.titleHighlight }}</span>
                </h1>
                <p class="text-sm text-gray-400 font-bold uppercase tracking-widest max-w-sm mb-8">
                  {{ hero.subtitle }}
                </p>
                <div class="flex gap-4">
                  <div class="h-10 w-1 bg-hus-blue"></div>
                  <div class="flex flex-col justify-center">
                    <span class="text-[10px] font-bold text-gray-900 uppercase tracking-widest leading-none">HUS - VNU</span>
                    <span class="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">ESTABLISHED 1956</span>
                  </div>
                </div>
              </div>
              <div class="h-64 md:h-full relative overflow-hidden bg-gray-100">
                <img [src]="hero.imageUrl" alt="MIM Faculty Building" class="w-full h-full object-cover grayscale-0 hover:scale-105 transition-transform duration-700">
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- List Filter & Header -->
      <div class="border-b border-gray-100 sticky top-16 bg-white z-10">
         <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
             <span class="w-1 h-4 bg-hus-blue"></span>
             Cổng nghiên cứu khoa học
           </h2>
           
           <!-- Filter Buttons (Table Style - Accented with HUS Blue) -->
           <div class="flex border border-gray-200">
             <button (click)="setFilter('ALL')" 
                     [class.bg-hus-blue.text-white]="currentFilter === 'ALL'"
                     [class.text-gray-400]="currentFilter !== 'ALL'"
                     class="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all">
               Tất cả
             </button>
             <button (click)="setFilter('LECTURER')" 
                     [class.bg-hus-blue.text-white]="currentFilter === 'LECTURER'"
                     [class.text-gray-400]="currentFilter !== 'LECTURER'"
                     class="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest border-l border-gray-200 transition-all">
               Giảng viên
             </button>
             <button (click)="setFilter('STUDENT')" 
                     [class.bg-hus-blue.text-white]="currentFilter === 'STUDENT'"
                     [class.text-gray-400]="currentFilter !== 'STUDENT'"
                     class="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest border-l border-gray-200 transition-all">
               Sinh viên
             </button>
           </div>
         </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-12">
          
          <!-- LEFT: Research Index -->
          <div class="lg:col-span-3">
            <div *ngIf="(filteredPapers$ | async) as papers; else loading">
              <div *ngIf="papers.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
                Không tìm thấy dữ liệu.
              </div>
              
              <div class="divide-y divide-gray-100">
                <div *ngFor="let paper of papers" 
                     class="py-8 group cursor-pointer" 
                     (click)="navigateToDetail(paper.id)">
                   
                   <div class="flex items-start gap-6">
                     <!-- Minimal Category Indicator - Using HUS Blue for prominence -->
                     <div class="flex-shrink-0 w-8 h-8 border border-gray-100 flex items-center justify-center text-[10px] font-bold transition-all"
                          [ngClass]="paper.category === 'LECTURER' ? 'bg-hus-blue text-white' : 'bg-hus-gold text-white'">
                       {{ paper.category === 'LECTURER' ? 'GV' : 'SV' }}
                     </div>

                     <div class="flex-grow">
                        <div class="flex items-center gap-3 mb-2">
                          <span class="text-[10px] font-bold text-gray-900 uppercase tracking-tighter hover:text-hus-blue transition-colors">{{ getMainAuthor(paper) }}</span>
                          <span class="h-1 w-1 bg-gray-200 rounded-full"></span>
                          <span class="text-[10px] font-medium text-hus-blue uppercase tracking-tighter">{{ paper.researchArea }}</span>
                          <span class="h-1 w-1 bg-gray-200 rounded-full"></span>
                          <span class="text-[10px] font-medium text-gray-400 uppercase tabular-nums">{{ paper.publicationYear }}</span>
                        </div>

                        <h3 class="text-xl font-bold text-gray-900 leading-tight group-hover:text-hus-blue transition-all">
                          {{ paper.title }}
                        </h3>

                        <div class="mt-4 flex gap-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                          <span class="group-hover:text-gray-500 transition-colors">View: 1245</span>
                          <span class="group-hover:text-gray-500 transition-colors">Download: 32</span>
                          <span class="group-hover:text-gray-500 transition-colors">Cited: 5</span>
                        </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <ng-template #loading>
               <div class="py-20 flex justify-center">
                 <div class="h-4 w-4 bg-hus-blue animate-pulse"></div>
               </div>
            </ng-template>
          </div>

          <!-- RIGHT: Sidebar - Bulletins -->
           <div class="border-l border-gray-100 pl-8 space-y-12">
             <section>
               <h3 class="text-[10px] font-bold text-hus-blue uppercase tracking-widest mb-6 pb-2 border-b-2 border-hus-blue inline-block">
                 Bảng tin Khoa
               </h3>
               <div class="space-y-8">
                 <div *ngFor="let item of news$ | async" class="group cursor-pointer">
                   <p class="text-[9px] font-bold text-hus-blue opacity-50 mb-2 font-mono tabular-nums">{{ item.date | date:'dd.MM.yyyy' }}</p>
                   <h4 class="text-xs font-bold text-gray-700 leading-normal group-hover:text-hus-blue transition-colors">
                     {{ item.title }}
                   </h4>
                   <div class="mt-2 text-[10px] text-hus-blue opacity-0 group-hover:opacity-100 transition-opacity font-bold">Xem chi tiết &rarr;</div>
                 </div>
               </div>
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
           </div>

        </div>
      </div>
    </div>
  `
})
export class ResearchComponent implements OnInit {
  private paperService = inject(ResearchPaperService);
  private contentService = inject(ContentService);
  private router = inject(Router);

  allPapers$!: Observable<ResearchPaper[]>;
  filteredPapers$!: Observable<ResearchPaper[]>;
  news$!: Observable<any[]>;
  hero$!: Observable<ResearchHeroContent>;
  currentFilter: 'ALL' | 'LECTURER' | 'STUDENT' = 'ALL';

  ngOnInit(): void {
    this.hero$ = this.contentService.getResearchHeroContent();
    this.allPapers$ = this.paperService.getPapers();
    this.news$ = this.paperService.getNews();
    this.updateFilter();
  }

  setFilter(filter: 'ALL' | 'LECTURER' | 'STUDENT'): void {
    this.currentFilter = filter;
    this.updateFilter();
  }

  private updateFilter(): void {
    this.filteredPapers$ = this.allPapers$.pipe(
      map(papers => {
        if (this.currentFilter === 'ALL') return papers;
        return papers.filter(p => p.category === this.currentFilter);
      })
    );
  }

  navigateToDetail(id: string): void {
    this.router.navigate(['/paper', id]);
  }

  getMainAuthor(paper: ResearchPaper): string {
    const main = paper.authors.find(a => a.isMainAuthor) || paper.authors[0];
    return main ? main.name : 'Unknown';
  }
}
