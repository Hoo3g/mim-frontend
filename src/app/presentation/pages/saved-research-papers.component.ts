import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';

import { ROUTES } from '../../core/constants/route.const';
import { BookmarkedResearchPaper } from '../../core/models/research-paper.model';
import { ResearchPaperService } from '../../core/services/research-paper.service';
import { authSignal } from '../../core/signals/auth.signal';

@Component({
  selector: 'app-saved-research-papers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-white min-h-screen">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1 h-4 bg-hus-blue"></span>
            Danh sách nghiên cứu đã lưu
          </h2>
          <a [routerLink]="ROUTES.RESEARCH"
             class="inline-flex items-center justify-center px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-hus-blue border border-hus-blue hover:bg-hus-blue hover:text-white transition-colors">
            Xem cổng nghiên cứu
          </a>
        </div>

        <div *ngIf="bookmarkedPapers$ | async as papers">
          <div *ngIf="papers.length === 0"
               class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
            Bạn chưa lưu bài nghiên cứu nào.
          </div>

          <div *ngIf="papers.length > 0" class="divide-y divide-gray-100 border border-gray-100">
            <article *ngFor="let paper of papers"
                     (click)="openPaperDetail(paper.paperId)"
                     class="p-6 md:p-8 cursor-pointer group hover:bg-gray-50 transition-colors">
              <div class="flex flex-wrap items-center gap-3 mb-3 text-[10px] font-bold uppercase tracking-widest">
                <span class="text-hus-blue">{{ paper.researchArea }}</span>
                <span class="text-gray-300">|</span>
                <span class="text-gray-400">{{ paper.category === 'LECTURER' ? 'Giảng viên' : 'Sinh viên' }}</span>
                <ng-container *ngIf="paper.publicationYear">
                  <span class="text-gray-300">|</span>
                  <span class="text-gray-400 tabular-nums">{{ paper.publicationYear }}</span>
                </ng-container>
                <ng-container *ngIf="paper.savedAt">
                  <span class="text-gray-300">|</span>
                  <span class="text-gray-400">Lưu {{ paper.savedAt | date:'dd.MM.yyyy' }}</span>
                </ng-container>
              </div>

              <h3 class="text-xl font-bold text-gray-900 leading-tight group-hover:text-hus-blue transition-colors">
                {{ paper.title }}
              </h3>
            </article>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SavedResearchPapersComponent implements OnInit {
  private readonly paperService = inject(ResearchPaperService);
  private readonly router = inject(Router);

  protected readonly ROUTES = ROUTES;

  bookmarkedPapers$!: Observable<BookmarkedResearchPaper[]>;

  ngOnInit(): void {
    this.bookmarkedPapers$ = authSignal.isAuth()
      ? this.paperService.getBookmarkedPapers()
      : of([]);
  }

  openPaperDetail(paperId: string): void {
    this.router.navigateByUrl(ROUTES.RESEARCH_DETAIL(paperId));
  }
}
