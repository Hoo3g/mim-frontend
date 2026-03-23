import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, finalize, forkJoin, of, switchMap, timer } from 'rxjs';

import { Post } from '../../core/models/post.model';
import { PostService } from '../../core/services/post.service';
import { RecruitmentApplicationViewStateService } from '../../core/services/recruitment-application-view-state.service';
import { ROUTES } from '../../core/constants/route.const';
import { authSignal } from '../../core/signals/auth.signal';
import { PostDetailComponent } from './post-detail.component';
import { PendingApplicantResponse } from '../../core/models/profile.model';

@Component({
  selector: 'app-my-recruitment-posts',
  standalone: true,
  imports: [CommonModule, RouterModule, PostDetailComponent],
  template: `
    <div class="bg-white min-h-screen">
      <div class="bg-gray-50 border-b border-gray-100">
        
      </div>

      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10">
        <div *ngIf="errorMessage"
             class="mb-6 border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          {{ errorMessage }}
        </div>

        <div *ngIf="noticeMessage"
             class="mb-6 border border-hus-blue/20 bg-blue-50/40 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          {{ noticeMessage }}
        </div>

        <div *ngIf="!canCreateContent()"
             class="mb-6 border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-[10px] font-bold uppercase tracking-widest">
          Tài khoản chưa xác thực email. Bạn chỉ có thể xem bài đăng hiện có.
        </div>
        <div *ngIf="showStudentSinglePostNotice()"
             class="mb-6 border border-blue-200 bg-blue-50/40 text-hus-blue px-4 py-3 text-[10px] font-bold uppercase tracking-widest">
          Tài khoản sinh viên chỉ được tạo duy nhất 1 bài tuyển dụng. Bạn có thể chỉnh sửa bài đã có.
        </div>

        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1 h-4 bg-hus-blue"></span>
            Danh sách bài đăng của bạn
          </h2>

          <a *ngIf="canCreateRecruitmentPost(); else createRecruitmentBlockedCta"
             [routerLink]="ROUTES.RECRUITMENT_EDITOR"
             class="inline-flex items-center justify-center px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors">
            Tạo bài đăng mới
          </a>
          <ng-template #createRecruitmentBlockedCta>
            <a *ngIf="!canCreateContent(); else studentLimitCta"
               [routerLink]="ROUTES.PROFILE"
               class="inline-flex items-center justify-center px-5 py-2.5 border border-amber-300 text-[10px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-50 transition-colors">
              Xác thực email để đăng bài
            </a>
            <ng-template #studentLimitCta>
              <span *ngIf="!loading && isStudentViewer() && studentCreateLimitReached"
                    class="inline-flex items-center justify-center border border-gray-200 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Sinh viên đã có bài tuyển dụng
              </span>
            </ng-template>
          </ng-template>
        </div>

        <div *ngIf="loading"
             class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
          Đang tải danh sách bài đăng...
        </div>

        <div *ngIf="!loading && posts.length === 0"
             class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
          Bạn chưa có bài đăng tuyển dụng nào.
        </div>

        <div *ngIf="!loading && posts.length > 0" class="divide-y divide-gray-100 border border-gray-100">
          <article *ngFor="let post of posts"
                   class="p-6 md:p-8 group hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-3 mb-3 text-[10px] font-bold uppercase tracking-widest">
                  <span class="text-hus-blue">{{ postTypeLabel(post.postType) }}</span>
                  <span class="text-gray-300">|</span>
                  <span class="text-gray-400">{{ jobTypeLabel(post.jobType) }}</span>
                  <span class="text-gray-300">|</span>
                  <span [ngClass]="statusClass(post.status)">{{ statusLabel(post.status) }}</span>
                  <span *ngIf="post.approvalStatus" class="text-gray-300">|</span>
                  <span *ngIf="post.approvalStatus" [ngClass]="approvalClass(post.approvalStatus)">
                    {{ approvalLabel(post.approvalStatus) }}
                  </span>
                </div>

                <h3 class="text-xl font-bold text-gray-900 leading-tight">
                  {{ post.title }}
                </h3>

                <p class="mt-3 text-[12px] text-gray-500 leading-relaxed line-clamp-2 whitespace-pre-line [overflow-wrap:anywhere]">
                  {{ post.description }}
                </p>

                <p class="mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {{ post.location || 'Chưa cập nhật địa điểm' }}
                  <span *ngIf="post.updatedAt"> | cập nhật {{ post.updatedAt | date:'dd.MM.yyyy' }}</span>
                </p>
              </div>

              <div class="relative shrink-0" data-post-actions>
                <button type="button"
                        (click)="toggleActionMenu(post.id, $event)"
                        [attr.aria-expanded]="openedActionPostId === post.id"
                        aria-haspopup="menu"
                        title="Tùy chọn"
                        aria-label="Tùy chọn"
                        class="relative inline-flex h-11 w-11 items-center justify-center text-gray-500 transition-colors hover:text-hus-blue">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="12" cy="19" r="1.75" />
                  </svg>
                  <span *ngIf="isCompanyViewer() && applicantCount(post.id) > 0"
                        class="absolute right-0.5 top-0.5 min-w-[16px] rounded-full bg-red-500 px-1 text-[9px] font-black leading-4 text-white">
                    {{ applicantCount(post.id) }}
                  </span>
                </button>

                <div *ngIf="openedActionPostId === post.id"
                     role="menu"
                     class="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[220px] overflow-hidden border border-gray-200 bg-white shadow-lg">
                  <button type="button"
                          role="menuitem"
                          (click)="openPreview(post)"
                          class="flex w-full items-center justify-between px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50">
                    <span class="inline-flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.008 9.963 7.178.07.207.07.437 0 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.008-9.964-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      <span>Xem preview</span>
                    </span>
                  </button>

                  <button *ngIf="isCompanyViewer()"
                          type="button"
                          role="menuitem"
                          (click)="openStatistics(post, $event)"
                          class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50">
                    <span class="inline-flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.5h4.5V21H3v-7.5Zm6.75-4.5h4.5V21h-4.5V9Zm6.75-6h4.5V21h-4.5V3Z" />
                      </svg>
                      <span>Thống kê ứng viên</span>
                    </span>
                    <span *ngIf="applicantCount(post.id) > 0"
                          class="rounded-full bg-red-500 px-1.5 text-[9px] leading-4 text-white">
                      {{ applicantCount(post.id) }}
                    </span>
                  </button>

                  <button *ngIf="canCreateContent(); else verifyEditMenuItem"
                          type="button"
                          role="menuitem"
                          (click)="editPost(post, $event)"
                          class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50">
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
                       class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50">
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
                          (click)="deletePost(post, $event)"
                          [disabled]="deletingPostIds.has(post.id)"
                          class="flex w-full items-center justify-between border-t border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                    <span class="inline-flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.347 9m-4.786 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084A2.25 2.25 0 0 1 5.84 19.673L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0V4.875A2.25 2.25 0 0 0 13.5 2.625h-3a2.25 2.25 0 0 0-2.25 2.25V5.79m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      <span>{{ deletingPostIds.has(post.id) ? 'Đang xóa...' : 'Xóa bài đăng' }}</span>
                    </span>
                    <svg *ngIf="deletingPostIds.has(post.id)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle>
                      <path class="opacity-90" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-2a7 7 0 0 0-7-7V3Z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <a *ngIf="!canCreateContent()"
               [routerLink]="ROUTES.PROFILE"
               class="mt-4 inline-flex text-[10px] font-black uppercase tracking-widest text-amber-800 hover:text-amber-900 transition-colors">
              Xác thực email để chỉnh sửa bài
            </a>
          </article>
        </div>
      </div>

      <app-post-detail *ngIf="selectedPost"
                       [post]="selectedPost"
                       [showActions]="false"
                       (close)="closePreview()">
      </app-post-detail>
    </div>
  `
})
export class MyRecruitmentPostsComponent implements OnInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly recruitmentApplicationViewState = inject(RecruitmentApplicationViewStateService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly ROUTES = ROUTES;
  protected readonly canCreateContent = authSignal.canCreateContent;

  loading = true;
  posts: Post[] = [];
  noticeMessage = '';
  errorMessage = '';
  selectedPost: Post | null = null;
  receivedApplicants: PendingApplicantResponse[] = [];
  studentCreateLimitReached = false;
  deletingPostIds = new Set<string>();
  openedActionPostId: string | null = null;
  private pollSubscription?: Subscription;

  ngOnInit(): void {
    const currentUser = authSignal.user();
    if (!currentUser) {
      this.router.navigateByUrl(ROUTES.AUTH.LOGIN);
      return;
    }

    if (currentUser.role !== 'STUDENT' && currentUser.role !== 'COMPANY') {
      this.errorMessage = 'Chỉ tài khoản sinh viên hoặc doanh nghiệp mới có thể quản lý bài đăng tuyển dụng.';
      this.loading = false;
      return;
    }

    const navigationNotice = this.router.getCurrentNavigation()?.extras.state?.['notice'];
    const historyNotice = history.state?.['notice'];
    this.noticeMessage = (navigationNotice ?? historyNotice ?? '') as string;

    if (this.noticeMessage) {
      const currentState = { ...(history.state as Record<string, unknown>) };
      delete currentState['notice'];
      history.replaceState(currentState, document.title);
    }

    const applicants$ = currentUser.role === 'COMPANY'
      ? this.postService.getReceivedPendingApplications()
      : of([] as PendingApplicantResponse[]);

    forkJoin({
      posts: this.postService.getMyPosts(currentUser.id),
      applicants: applicants$
    }).subscribe({
      next: ({ posts, applicants }) => {
        this.posts = posts;
        this.studentCreateLimitReached = this.isStudentViewer() && this.posts.length > 0;
        this.receivedApplicants = applicants;
        this.loading = false;
        this.syncPolling(currentUser.id);
      },
      error: () => {
        this.errorMessage = 'Không thể tải danh sách bài đăng tuyển dụng.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
    this.closeActionMenu();
    this.unlockBodyScroll();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-post-actions]')) {
      this.closeActionMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.closeActionMenu();
  }

  private startPolling(userId: string): void {
    if (this.pollSubscription) return;

    // Only poll when there are posts in PENDING approval status
    const hasPending = this.posts.some((p) => !p.approvalStatus || p.approvalStatus === 'PENDING');
    if (!hasPending) return;

    // Poll every 10 seconds, bypassing cache, to reflect approval status quickly
    this.pollSubscription = timer(10000, 10000).pipe(
      switchMap(() => this.postService.getMyPosts(userId, true))
    ).subscribe({
      next: (posts) => {
        this.posts = posts;
        this.studentCreateLimitReached = this.isStudentViewer() && this.posts.length > 0;
        // Stop polling once all posts have a final status (no more PENDING)
        const stillPending = posts.some((p) => !p.approvalStatus || p.approvalStatus === 'PENDING');
        if (!stillPending) {
          this.pollSubscription?.unsubscribe();
          this.pollSubscription = undefined;
        }
      }
    });
  }

  openPreview(post: Post): void {
    this.closeActionMenu();
    this.selectedPost = post;
    this.lockBodyScroll();
  }

  closePreview(): void {
    this.selectedPost = null;
    this.unlockBodyScroll();
  }

  editPost(post: Post, event: Event): void {
    event.stopPropagation();
    this.closeActionMenu();
    this.router.navigateByUrl(ROUTES.RECRUITMENT_EDITOR_EDIT(post.id));
  }

  openStatistics(post: Post, event: Event): void {
    event.stopPropagation();
    this.closeActionMenu();
    this.router.navigateByUrl(ROUTES.RECRUITMENT_POST_STATS(post.id));
  }

  deletePost(post: Post, event: Event): void {
    event.stopPropagation();
    this.closeActionMenu();

    if (this.deletingPostIds.has(post.id)) {
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa bài đăng "${post.title}"?`)) {
      return;
    }

    const currentUserId = authSignal.user()?.id;
    if (!currentUserId) {
      this.router.navigateByUrl(ROUTES.AUTH.LOGIN);
      return;
    }

    this.errorMessage = '';
    this.noticeMessage = '';
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
    this.deletingPostIds.add(post.id);

    this.postService.deleteMyPost(post.id).pipe(
      finalize(() => {
        this.deletingPostIds.delete(post.id);
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (deleted) => {
        if (!deleted) {
          this.errorMessage = 'Không thể xóa bài đăng đã chọn.';
          this.syncPolling(currentUserId);
          this.cdr.detectChanges();
          return;
        }

        const removedApplicationIds = this.receivedApplicants
          .filter((item) => item.postId === post.id)
          .map((item) => item.applicationId);
        this.posts = this.posts.filter((item) => item.id !== post.id);
        this.studentCreateLimitReached = this.isStudentViewer() && this.posts.length > 0;
        this.receivedApplicants = this.receivedApplicants.filter((item) => item.postId !== post.id);
        this.recruitmentApplicationViewState.removeViewed(removedApplicationIds);
        if (this.selectedPost?.id === post.id) {
          this.closePreview();
        }
        this.noticeMessage = 'Đã xóa bài đăng tuyển dụng.';
        this.syncPolling(currentUserId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Không thể xóa bài đăng đã chọn.';
        this.syncPolling(currentUserId);
        this.cdr.detectChanges();
      }
    });
  }

  toggleActionMenu(postId: string, event: Event): void {
    event.stopPropagation();
    this.openedActionPostId = this.openedActionPostId === postId ? null : postId;
  }

  closeActionMenu(): void {
    this.openedActionPostId = null;
  }

  statusLabel(status: Post['status']): string {
    if (status === 'CLOSED') return 'Đã đóng';
    if (status === 'DRAFT') return 'Nháp';
    return 'Đang mở';
  }

  statusClass(status: Post['status']): string {
    if (status === 'CLOSED') return 'text-red-500';
    if (status === 'DRAFT') return 'text-gray-500';
    return 'text-emerald-600';
  }

  approvalLabel(status?: Post['approvalStatus']): string {
    if (status === 'REJECTED') return 'Bị từ chối';
    if (status === 'APPROVED') return 'Đã duyệt';
    return 'Chờ duyệt';
  }

  approvalClass(status?: Post['approvalStatus']): string {
    if (status === 'REJECTED') return 'text-red-500';
    if (status === 'APPROVED') return 'text-emerald-600';
    return 'text-amber-600';
  }

  postTypeLabel(type: Post['postType']): string {
    if (type.includes('COMPANY')) {
      return 'Doanh nghiệp';
    }
    return 'Sinh viên';
  }

  jobTypeLabel(jobType: Post['jobType']): string {
    if (jobType === 'PART_TIME') return 'Part-time';
    if (jobType === 'CONTRACT') return 'Hợp đồng';
    if (jobType === 'INTERNSHIP') return 'Thực tập';
    return 'Full-time';
  }

  applicantCount(postId: string): number {
    const applicationIds = this.receivedApplicants
      .filter((item) => item.postId === postId)
      .map((item) => item.applicationId);
    return this.recruitmentApplicationViewState.countUnread(applicationIds);
  }

  isCompanyViewer(): boolean {
    return authSignal.user()?.role === 'COMPANY';
  }

  isStudentViewer(): boolean {
    return authSignal.user()?.role === 'STUDENT';
  }

  canCreateRecruitmentPost(): boolean {
    if (!this.canCreateContent()) {
      return false;
    }

    if (!this.isStudentViewer()) {
      return true;
    }

    if (this.loading) {
      return false;
    }

    return !this.studentCreateLimitReached;
  }

  showStudentSinglePostNotice(): boolean {
    return !this.loading && this.canCreateContent() && this.isStudentViewer() && this.studentCreateLimitReached;
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = 'auto';
  }

  private syncPolling(userId: string): void {
    const hasPending = this.posts.some((post) => !post.approvalStatus || post.approvalStatus === 'PENDING');

    if (!hasPending) {
      this.pollSubscription?.unsubscribe();
      this.pollSubscription = undefined;
      return;
    }

    this.startPolling(userId);
  }
}
