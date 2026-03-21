import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { of, Subscription, timer } from 'rxjs';
import { finalize, switchMap, take, tap } from 'rxjs/operators';

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
        
      </div>

      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10">
        <div *ngIf="errorMessage"
             class="mb-6 border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          {{ errorMessage }}
        </div>

        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1 h-4 bg-hus-blue"></span>
            Danh sách nghiên cứu đã tạo
          </h2>
          <a *ngIf="canCreateContent(); else verifyResearchCta"
             [routerLink]="ROUTES.RESEARCH_EDITOR"
             class="inline-flex items-center justify-center px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors">
            Tạo bài viết
          </a>
          <ng-template #verifyResearchCta>
            <a [routerLink]="ROUTES.PROFILE"
               class="inline-flex items-center justify-center px-5 py-2.5 border border-amber-300 text-[10px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-50 transition-colors">
              Xác thực email để đăng bài
            </a>
          </ng-template>
        </div>

        <div *ngIf="noticeMessage"
             class="mb-6 border border-hus-blue/20 bg-blue-50/40 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          {{ noticeMessage }}
        </div>

        <div *ngIf="!canCreateContent()"
             class="mb-6 border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-[10px] font-bold uppercase tracking-widest">
          Tài khoản chưa xác thực email. Bạn chỉ có thể xem danh sách bài viết.
        </div>

        <div *ngIf="displayedPapers">
          <div *ngIf="displayedPapers.length === 0"
               class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
            Bạn chưa có bài viết nghiên cứu nào.
          </div>

          <div *ngIf="displayedPapers.length > 0" class="divide-y divide-gray-100 border border-gray-100">
            <article *ngFor="let paper of displayedPapers"
                     class="p-6 md:p-8 group hover:bg-gray-50 transition-colors">
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
                <button *ngIf="canCreateContent()"
                        type="button"
                        (click)="editPaper(paper.id, $event)"
                        class="px-4 py-2 border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-hus-blue hover:text-white transition-colors">
                  Chỉnh sửa
                </button>
                <a *ngIf="!canCreateContent()"
                   [routerLink]="ROUTES.PROFILE"
                   (click)="$event.stopPropagation()"
                   class="px-4 py-2 border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-colors">
                  Xác thực email để sửa
                </a>
                <button type="button"
                        (click)="deletePaper(paper, $event)"
                        [disabled]="deletingPaperIds.has(paper.id)"
                        class="px-4 py-2 border border-red-200 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {{ deletingPaperIds.has(paper.id) ? 'Đang xóa...' : 'Xóa' }}
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MyResearchPapersComponent implements OnInit, OnDestroy {
  private readonly paperService = inject(ResearchPaperService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly ROUTES = ROUTES;
  protected readonly canCreateContent = authSignal.canCreateContent;

  displayedPapers: ResearchPaper[] = [];
  noticeMessage = '';
  errorMessage = '';
  deletingPaperIds = new Set<string>();
  private pollSubscription?: Subscription;

  ngOnInit(): void {
    this.startPolling();

    const navigationNotice = this.router.getCurrentNavigation()?.extras.state?.['notice'];
    const historyNotice = history.state?.['notice'];
    this.noticeMessage = (navigationNotice ?? historyNotice ?? '') as string;

    if (this.noticeMessage) {
      const currentState = { ...(history.state as Record<string, unknown>) };
      delete currentState['notice'];
      history.replaceState(currentState, document.title);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.stopPolling();

    // Poll every 10s if we have PENDING papers to show updates
    this.pollSubscription = timer(0, 10_000).pipe(
      switchMap(() => {
        const currentUser = authSignal.user();
        if (!currentUser) return of([]);
        return this.paperService.getMyPapers(currentUser, true).pipe(take(1));
      }),
      tap(papers => {
        this.displayedPapers = papers;
        // If no papers are PENDING, we could potentially slow down polling or stop it,
        // but for research papers (which are fewer), 10s is fine while the page is open.
      })
    ).subscribe();
  }

  private stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }

  editPaper(id: string, event: Event): void {
    event.stopPropagation();
    this.openEditor(id);
  }

  deletePaper(paper: ResearchPaper, event: Event): void {
    event.stopPropagation();

    if (this.deletingPaperIds.has(paper.id)) {
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa bài nghiên cứu "${paper.title}"?`)) {
      return;
    }

    this.errorMessage = '';
    this.noticeMessage = '';
    this.stopPolling();
    this.deletingPaperIds.add(paper.id);

    this.paperService.deleteMyPaper(paper.id).pipe(
      finalize(() => {
        this.deletingPaperIds.delete(paper.id);
        if (this.deletingPaperIds.size === 0) {
          this.startPolling();
        }
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (deleted) => {
        if (!deleted) {
          this.errorMessage = 'Không thể xóa bài nghiên cứu đã chọn.';
          this.cdr.detectChanges();
          return;
        }

        this.displayedPapers = this.displayedPapers.filter((item) => item.id !== paper.id);
        this.noticeMessage = 'Đã xóa bài nghiên cứu.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Không thể xóa bài nghiên cứu đã chọn.';
        this.cdr.detectChanges();
      }
    });
  }

  openEditor(id: string): void {
    if (!this.canCreateContent()) {
      this.router.navigateByUrl(ROUTES.PROFILE, {
        state: {
          notice: 'Tài khoản chưa xác thực email. Bạn chưa thể chỉnh sửa hoặc tạo bài viết.'
        }
      });
      return;
    }
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
