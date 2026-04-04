import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bg-white min-h-screen">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10">
        <div *ngIf="errorMessage"
             class="mb-6 border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          {{ errorMessage }}
        </div>

        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1 h-4 bg-hus-blue"></span>
            Danh sách <span class="text-hus-blue">nghiên cứu</span>
          </h2>
          <a *ngIf="canCreateContent(); else verifyResearchCta"
             [routerLink]="ROUTES.RESEARCH_EDITOR"
             class="inline-flex items-center justify-center rounded-md px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors">
            Tạo bài viết
          </a>
          <ng-template #verifyResearchCta>
            <a [routerLink]="ROUTES.PROFILE"
               class="inline-flex items-center justify-center rounded-md px-5 py-2.5 border border-amber-300 text-[10px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-50 transition-colors">
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

        <div class="mb-6">
          <label for="researchTitleSearch"
                 class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Tìm kiếm bài nghiên cứu
          </label>
          <div class="max-w-3xl">
            <div class="min-w-0">
              <textarea id="researchTitleSearch"
                        name="researchTitleSearch"
                        rows="1"
                        [(ngModel)]="searchKeyword"
                        (ngModelChange)="onSearchKeywordChange($event)"
                        (input)="onSearchFieldInput($event)"
                        class="w-full min-h-[44px] resize-none overflow-hidden border border-gray-200 bg-white rounded-md px-4 py-2.5 text-sm leading-6 text-gray-900 break-all focus:outline-none focus:border-hus-blue transition-colors sm:min-h-[46px]"
                        style="overflow-wrap:anywhere;"
                        placeholder="Nhập tên bài nghiên cứu cần tìm"></textarea>
            </div>

            <button *ngIf="searchKeyword.trim()"
                    type="button"
                    (click)="clearSearch()"
                    class="mt-2 inline-flex items-center justify-center gap-2 self-end rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-700 transition-colors"
                    aria-label="Xóa nội dung tìm kiếm"
                    title="Xóa nội dung tìm kiếm">
              <svg viewBox="0 0 24 24"
                   class="h-4 w-4"
                   fill="none"
                   stroke="currentColor"
                   stroke-width="2"
                   aria-hidden="true">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
              <span>Xóa tìm kiếm</span>
            </button>
          </div>
        </div>

        <div *ngIf="displayedPapers">
          <div *ngIf="displayedPapers.length === 0"
               class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
            {{ emptyStateMessage() }}
          </div>

          <div *ngIf="displayedPapers.length > 0" class="divide-y divide-gray-100 border border-gray-100">
            <article *ngFor="let paper of displayedPapers"
                     class="p-6 md:p-8 transition-colors">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-3 mb-3 text-[10px] font-bold uppercase tracking-widest">
                    <span class="text-hus-blue">{{ paper.researchArea }}</span>
                    <span class="text-gray-300">|</span>
                    <span class="text-gray-400">{{ paper.paperType === 'GRADUATION_THESIS' ? 'Khóa luận tốt nghiệp' : 'Nghiên cứu khoa học' }}</span>
                    <span class="text-gray-300">|</span>
                    <span class="text-gray-400 tabular-nums">{{ paper.publicationYear }}</span>
                    <span class="text-gray-300">|</span>
                    <span class="text-gray-400">{{ paper.category === 'LECTURER' ? 'Giảng viên' : 'Sinh viên' }}</span>
                    <span class="text-gray-300">|</span>
                    <span [ngClass]="statusClass(paper.approvalStatus)">
                      {{ statusLabel(paper.approvalStatus) }}
                    </span>
                  </div>

                  <h3 (click)="openPaperDetail(paper.id, $event)"
                      class="cursor-pointer text-xl font-bold text-gray-900 leading-tight transition-colors hover:text-hus-blue">
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
                  </div>
                </div>

                <div class="relative shrink-0" data-paper-actions>
                  <button type="button"
                          (click)="toggleActionMenu(paper.id, $event)"
                          [attr.aria-expanded]="openedActionPaperId === paper.id"
                          aria-haspopup="menu"
                          title="Tùy chọn"
                          aria-label="Tùy chọn"
                          class="relative inline-flex h-11 w-11 items-center justify-center text-gray-500 transition-colors hover:text-hus-blue">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5" r="1.75" />
                      <circle cx="12" cy="12" r="1.75" />
                      <circle cx="12" cy="19" r="1.75" />
                    </svg>
                  </button>

                  <div *ngIf="openedActionPaperId === paper.id"
                       role="menu"
                       class="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[220px] overflow-hidden border border-gray-200 bg-white shadow-lg">
                    <button *ngIf="canCreateContent(); else verifyEditMenuItem"
                            type="button"
                            role="menuitem"
                            (click)="editPaper(paper.id, $event)"
                            class="flex w-full items-center justify-between px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50">
                      <span class="inline-flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                        </svg>
                        <span>Chỉnh sửa</span>
                      </span>
                    </button>
                    <ng-template #verifyEditMenuItem>
                      <a [routerLink]="ROUTES.PROFILE"
                         role="menuitem"
                         (click)="closeActionMenu()"
                         class="flex w-full items-center justify-between px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50">
                        <span class="inline-flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21h-10.5A2.25 2.25 0 0 1 4.5 18.75v-6A2.25 2.25 0 0 1 6.75 10.5Z" />
                          </svg>
                          <span>Xác thực email để sửa</span>
                        </span>
                      </a>
                    </ng-template>

                    <button type="button"
                            role="menuitem"
                            (click)="deletePaper(paper, $event)"
                            [disabled]="deletingPaperIds.has(paper.id)"
                            class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                      <span class="inline-flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.347 9m-4.786 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084A2.25 2.25 0 0 1 5.84 19.673L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0V4.875A2.25 2.25 0 0 0 13.5 2.625h-3a2.25 2.25 0 0 0-2.25 2.25V5.79m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        <span>{{ deletingPaperIds.has(paper.id) ? 'Đang xóa...' : 'Xóa bài viết' }}</span>
                      </span>
                      <svg *ngIf="deletingPaperIds.has(paper.id)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle>
                        <path class="opacity-90" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-2a7 7 0 0 0-7-7V3Z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
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

  allPapers: ResearchPaper[] = [];
  displayedPapers: ResearchPaper[] = [];
  searchKeyword = '';
  noticeMessage = '';
  errorMessage = '';
  deletingPaperIds = new Set<string>();
  openedActionPaperId: string | null = null;
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
    this.closeActionMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-paper-actions]')) {
      this.closeActionMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.closeActionMenu();
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
        this.allPapers = papers;
        this.applySearchFilter();
        this.cdr.detectChanges();
        // If no papers are PENDING, we could potentially slow down polling or stop it,
        // but for research papers (which are fewer), 10s is fine while the page is open.
      })
    ).subscribe({
      error: () => {
        this.errorMessage = 'Không thể tải danh sách bài nghiên cứu.';
        this.cdr.detectChanges();
      }
    });
  }

  private stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }

  editPaper(id: string, event: Event): void {
    event.stopPropagation();
    this.closeActionMenu();
    this.openEditor(id);
  }

  openPaperDetail(id: string, event?: Event): void {
    event?.stopPropagation();
    this.router.navigateByUrl(ROUTES.RESEARCH_DETAIL(id));
  }

  deletePaper(paper: ResearchPaper, event: Event): void {
    event.stopPropagation();
    this.closeActionMenu();

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

        this.allPapers = this.allPapers.filter((item) => item.id !== paper.id);
        this.applySearchFilter();
        this.noticeMessage = 'Đã xóa bài nghiên cứu.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Không thể xóa bài nghiên cứu đã chọn.';
        this.cdr.detectChanges();
      }
    });
  }

  toggleActionMenu(paperId: string, event: Event): void {
    event.stopPropagation();
    this.openedActionPaperId = this.openedActionPaperId === paperId ? null : paperId;
  }

  closeActionMenu(): void {
    this.openedActionPaperId = null;
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

  onSearchKeywordChange(value: string): void {
    this.searchKeyword = value ?? '';
    this.applySearchFilter();
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.applySearchFilter();
    this.syncSearchFieldHeight();
  }

  onSearchFieldInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement | null;
    if (!textarea) {
      return;
    }
    this.autoResizeTextarea(textarea);
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

  emptyStateMessage(): string {
    if (this.searchKeyword.trim()) {
      return 'Không tìm thấy bài nghiên cứu phù hợp.';
    }
    return 'Bạn chưa có bài viết nghiên cứu nào.';
  }

  private applySearchFilter(): void {
    const normalizedKeyword = this.normalizeSearchValue(this.searchKeyword);
    if (!normalizedKeyword) {
      this.displayedPapers = [...this.allPapers];
      return;
    }

    this.displayedPapers = this.allPapers.filter((paper) =>
      this.normalizeSearchValue(paper.title).includes(normalizedKeyword)
    );
  }

  private normalizeSearchValue(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  private syncSearchFieldHeight(): void {
    setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#researchTitleSearch');
      if (!textarea) {
        return;
      }
      this.autoResizeTextarea(textarea);
    });
  }
}
