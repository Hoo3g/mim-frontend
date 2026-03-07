import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { combineLatest, map, Observable, of } from 'rxjs';

import { ResearchPaper } from '../../core/models/research-paper.model';
import { ResearchPaperService } from '../../core/services/research-paper.service';
import { ROUTES } from '../../core/constants/route.const';
import { authSignal } from '../../core/signals/auth.signal';

@Component({
    selector: 'app-my-research-papers',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="bg-white min-h-screen">
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div class="relative overflow-hidden border-2 border-hus-blue/10 bg-white p-8 md:p-10">
            <h1 class="text-3xl md:text-4xl font-black text-gray-900 leading-tight uppercase tracking-tighter">
              Bài viết <span class="text-hus-blue">Nghiên cứu</span> của tôi
            </h1>
            <p class="mt-4 text-sm text-gray-400 font-bold uppercase tracking-widest max-w-2xl">
              Quản lý danh sách công trình bạn đã tạo và tiếp tục hoàn thiện nội dung nghiên cứu.
            </p>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1 h-4 bg-hus-blue"></span>
            Danh sách nghiên cứu đã tạo
          </h2>
          <a [routerLink]="ROUTES.RESEARCH_EDITOR"
             class="inline-flex items-center justify-center px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors">
            Tạo bài viết
          </a>
        </div>

        <div *ngIf="noticeMessage"
             class="mb-6 border border-hus-blue/20 bg-blue-50/40 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          {{ noticeMessage }}
        </div>

        <div *ngIf="isFallbackMode$ | async"
             class="mb-6 border border-amber-200 bg-amber-50/50 text-amber-700 text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          Bạn chưa có bài viết cá nhân, đang hiển thị danh sách nghiên cứu mẫu.
        </div>

        <div *ngIf="displayedPapers$ | async as papers">
          <div *ngIf="papers.length === 0"
               class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
            Bạn chưa có bài viết nghiên cứu nào.
          </div>

          <div *ngIf="papers.length > 0" class="divide-y divide-gray-100 border border-gray-100">
            <article *ngFor="let paper of papers"
                     (click)="openEditor(paper.id)"
                     class="p-6 md:p-8 cursor-pointer group hover:bg-gray-50 transition-colors">
              <div class="flex flex-wrap items-center gap-3 mb-3 text-[10px] font-bold uppercase tracking-widest">
                <span class="text-hus-blue">{{ paper.researchArea }}</span>
                <span class="text-gray-300">|</span>
                <span class="text-gray-400 tabular-nums">{{ paper.publicationYear }}</span>
                <span class="text-gray-300">|</span>
                <span class="text-gray-400">{{ paper.category === 'LECTURER' ? 'Giảng viên' : 'Sinh viên' }}</span>
                <span class="text-gray-300">|</span>
                <span [ngClass]="statusClass(paper.approvalStatus)">
                  {{ statusLabel(paper.approvalStatus) }}
                </span>
              </div>

              <h3 class="text-xl font-bold text-gray-900 leading-tight group-hover:text-hus-blue transition-colors">
                {{ paper.title }}
              </h3>

              <p class="mt-3 text-[12px] text-gray-500 leading-relaxed line-clamp-2">
                {{ toPlainText(paper.abstract) }}
              </p>

              <p *ngIf="paper.approvalStatus === 'REJECTED' && paper.moderationComment"
                 class="mt-3 text-[10px] font-bold uppercase tracking-widest text-red-500">
                Lý do từ chối: {{ paper.moderationComment }}
              </p>

              <div class="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                <span class="text-gray-400">Tác giả chính: {{ paper.authors[0]?.name || 'N/A' }}</span>
                <span class="text-gray-300">•</span>
                <span class="text-hus-blue">Nhấn để chỉnh sửa</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MyResearchPapersComponent implements OnInit {
    private readonly paperService = inject(ResearchPaperService);
    private readonly router = inject(Router);

    protected readonly ROUTES = ROUTES;

    displayedPapers$!: Observable<ResearchPaper[]>;
    isFallbackMode$!: Observable<boolean>;
    noticeMessage = '';

    ngOnInit(): void {
        const currentUser = authSignal.user();
        const myPapers$ = currentUser ? this.paperService.getMyPapers(currentUser) : of([]);
        const allPapers$ = this.paperService.getPapers();

        this.displayedPapers$ = combineLatest([myPapers$, allPapers$]).pipe(
            map(([myPapers, allPapers]) => (myPapers.length > 0 ? myPapers : allPapers))
        );

        this.isFallbackMode$ = myPapers$.pipe(
            map((myPapers) => myPapers.length === 0)
        );

        const navigationNotice = this.router.getCurrentNavigation()?.extras.state?.['notice'];
        const historyNotice = history.state?.['notice'];
        this.noticeMessage = (navigationNotice ?? historyNotice ?? '') as string;

        if (this.noticeMessage) {
            const currentState = { ...(history.state as Record<string, unknown>) };
            delete currentState['notice'];
            history.replaceState(currentState, document.title);
        }
    }

    openEditor(id: string): void {
        this.router.navigateByUrl(ROUTES.RESEARCH_EDITOR_EDIT(id));
    }

    toPlainText(html: string): string {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html ?? '';
        return (wrapper.textContent ?? '').replace(/\u00A0/g, ' ').trim();
    }

    statusLabel(status?: string): string {
        if (status === 'PENDING') return 'Chờ duyệt';
        if (status === 'REJECTED') return 'Bị từ chối';
        return 'Đã duyệt';
    }

    statusClass(status?: string): string {
        if (status === 'PENDING') return 'text-amber-600';
        if (status === 'REJECTED') return 'text-red-500';
        return 'text-emerald-600';
    }
}
