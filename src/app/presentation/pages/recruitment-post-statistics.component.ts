import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ROUTES } from '../../core/constants/route.const';
import { PendingApplicantResponse } from '../../core/models/profile.model';
import { Post } from '../../core/models/post.model';
import { PostService } from '../../core/services/post.service';
import { RecruitmentApplicationViewStateService } from '../../core/services/recruitment-application-view-state.service';
import { authSignal } from '../../core/signals/auth.signal';

type ApplicantFilter = 'PENDING' | 'REVIEWED';

@Component({
  selector: 'app-recruitment-post-statistics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="min-h-screen bg-gray-50">
      <div class="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <a [routerLink]="ROUTES.RECRUITMENT_MY_POSTS"
           class="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-hus-blue transition-colors hover:text-hus-dark sm:text-[10px]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Quay lại bài đăng của bạn
        </a>

        <div *ngIf="errorMessage"
             class="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-600">
          {{ errorMessage }}
        </div>

        <div *ngIf="noticeMessage"
             class="mt-6 border border-hus-blue/20 bg-blue-50/40 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-hus-blue">
          {{ noticeMessage }}
        </div>

        <div *ngIf="loading"
             class="mt-6 border border-dashed border-gray-200 bg-white px-4 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Đang tải thống kê ứng viên...
        </div>

        <ng-container *ngIf="!loading && post">
          <header class="mt-6 border border-gray-100 rounded-md bg-white px-4 py-5 sm:px-8 sm:py-8">
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.25em] text-hus-blue">Thống kê ứng viên</p>
              <h1 class="mt-3 max-w-4xl text-xl font-black leading-tight text-gray-900 sm:text-3xl">
                {{ post.title }}
              </h1>
              <div class="mt-4 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-widest sm:text-[10px]">
                <span class="inline-flex items-center bg-blue-50 px-2.5 py-1 text-hus-blue">{{ postTypeLabel(post.postType) }}</span>
                <span class="inline-flex items-center bg-gray-100 px-2.5 py-1 text-gray-500">{{ jobTypeLabel(post.jobType) }}</span>
                <span class="inline-flex items-center bg-gray-100 px-2.5 py-1 text-gray-500">{{ statusLabel(post.status) }}</span>
                <span class="inline-flex items-center bg-gray-100 px-2.5 py-1 text-gray-500">{{ totalApplicantCount() }} hồ sơ đã ứng tuyển</span>
              </div>
            </div>

            <div class="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
              <div class="border border-gray-100 rounded-md bg-gray-50 px-4 py-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Địa điểm</p>
                <p class="mt-2 text-sm font-bold text-gray-900">{{ post.location || 'Chưa cập nhật' }}</p>
              </div>
              <div class="border border-gray-100 rounded-md bg-gray-50 px-4 py-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Trạng thái duyệt</p>
                <p class="mt-2 text-sm font-bold" [ngClass]="approvalClass(post.approvalStatus)">{{ approvalLabel(post.approvalStatus) }}</p>
              </div>
              <div class="border border-gray-100 rounded-md bg-gray-50 px-4 py-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Cập nhật gần nhất</p>
                <p class="mt-2 text-sm font-bold text-gray-900">{{ post.updatedAt | date:'dd.MM.yyyy HH:mm' }}</p>
              </div>
            </div>
          </header>

          <section class="mt-6 border border-gray-100 rounded-md bg-white">
            <div class="flex flex-col gap-2 border-b border-gray-100 px-4 py-4 sm:px-8 sm:py-5">
              <h2 class="text-lg font-black text-gray-900">Danh sách sinh viên ứng tuyển</h2>
              
              <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <button type="button"
                          (click)="setApplicantFilter('PENDING')"
                          [ngClass]="activeFilter === 'PENDING' ? 'border-hus-blue bg-blue-50 text-hus-blue' : 'border-gray-200 text-gray-500 hover:border-hus-blue/40 hover:text-hus-blue'"
                          class="inline-flex w-full items-center justify-between gap-2 border rounded-md px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors sm:w-auto sm:justify-center">
                    <span>Chờ xử lý</span>
                    <span class="rounded-full bg-white px-2 py-0.5 text-[9px] leading-none text-gray-500">
                      {{ pendingApplicants.length }}
                    </span>
                  </button>
                  <button type="button"
                          (click)="setApplicantFilter('REVIEWED')"
                          [ngClass]="activeFilter === 'REVIEWED' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600'"
                          class="inline-flex w-full items-center justify-between gap-2 border rounded-md px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors sm:w-auto sm:justify-center">
                    <span>Đã được đánh dấu</span>
                    <span class="rounded-full bg-white px-2 py-0.5 text-[9px] leading-none text-gray-500">
                      {{ reviewedApplicants.length }}
                    </span>
                  </button>
                </div>
                <div class="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:gap-3">
                  <label *ngIf="visibleApplicants().length > 0 && hasAnyVisibleSelected()"
                         class="inline-flex h-9 items-center gap-2 border border-gray-200 rounded-md px-3 text-[10px] font-black uppercase tracking-widest text-gray-500 sm:px-4">
                    <input type="checkbox"
                           class="h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue"
                           [checked]="isAllVisibleSelected()"
                           (click)="$event.stopPropagation()"
                           (change)="toggleSelectAllVisible($any($event.target).checked, $event)">
                    <span>Tất cả</span>
                  </label>
                  <button *ngIf="selectedApplicantCount() > 0"
                          type="button"
                          (click)="deleteSelectedApplicants()"
                          [disabled]="isBulkDeleting"
                          title="Xóa tất cả đã chọn"
                          aria-label="Xóa tất cả đã chọn"
                          class="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-red-200 rounded-md text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 7.5h12m-9.75 0V6a1.5 1.5 0 0 1 1.5-1.5h4.5A1.5 1.5 0 0 1 15.75 6v1.5m-8.25 0v10.125A1.875 1.875 0 0 0 9.375 19.5h5.25a1.875 1.875 0 0 0 1.875-1.875V7.5M10.5 10.5v6m3-6v6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="visibleApplicants().length === 0"
                 class="px-4 py-14 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:px-8 sm:py-16">
              {{ activeFilter === 'PENDING' ? 'Chưa có sinh viên ứng tuyển vào bài đăng này.' : 'Chưa có hồ sơ nào được đánh dấu.' }}
            </div>

            <div *ngIf="visibleApplicants().length > 0" class="divide-y divide-gray-100">
              <article *ngFor="let applicant of visibleApplicants()"
                       class="px-4 py-4 transition-colors sm:px-8 sm:py-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="flex min-w-0 items-start gap-3 lg:flex-1">
                    <input type="checkbox"
                           class="mt-1 h-4 w-4 shrink-0 border-gray-300 text-hus-blue focus:ring-hus-blue"
                           [checked]="isApplicantSelected(applicant)"
                           (click)="$event.stopPropagation()"
                           (change)="toggleApplicantSelection(applicant, $event)">
                    <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-3">
                      <h3 (click)="openApplicantPost(applicant, $event)"
                          [ngClass]="canOpenApplicantDetail(applicant) ? 'cursor-pointer hover:text-hus-blue' : ''"
                          class="text-[15px] font-black text-gray-900 [overflow-wrap:anywhere] transition-colors sm:text-base">
                        {{ applicant.applicantName || 'Sinh viên' }}
                      </h3>
                      <span *ngIf="applicant.status === 'REVIEWED'"
                            class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Đã được đánh dấu
                      </span>
                      <span *ngIf="hasUnreadApplicants()"
                            [ngClass]="isApplicantViewed(applicant)
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-amber-50 text-amber-600'"
                            class="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                        {{ isApplicantViewed(applicant) ? 'Đã xem' : 'Chưa xem' }}
                      </span>
                    </div>

                    <p class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Ứng tuyển {{ applicant.appliedAt | date:'dd.MM.yyyy HH:mm' }}
                    </p>

                    <p *ngIf="applicant.message"
                       class="mt-3 max-w-3xl whitespace-pre-line text-[13px] leading-6 text-gray-600 [overflow-wrap:anywhere] sm:text-sm sm:leading-7">
                      {{ applicant.message }}
                    </p>
                    </div>
                  </div>

                  <div class="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
                    <button type="button"
                            [disabled]="!hasApplicantEmail(applicant)"
                            (click)="contactApplicant(applicant, $event)"
                            class="inline-flex w-full items-center justify-center border border-gray-200 rounded-md px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors sm:w-auto"
                            [ngClass]="hasApplicantEmail(applicant)
                              ? 'text-gray-600 hover:border-hus-blue hover:text-hus-blue'
                              : 'cursor-not-allowed text-gray-300'">
                      {{ hasApplicantEmail(applicant) ? 'Liên hệ' : 'Không có email' }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </ng-container>
      </div>
    </section>
  `
})
export class RecruitmentPostStatisticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly recruitmentApplicationViewState = inject(RecruitmentApplicationViewStateService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly ROUTES = ROUTES;

  loading = true;
  errorMessage = '';
  noticeMessage = '';
  post: Post | null = null;
  activeFilter: ApplicantFilter = 'PENDING';
  pendingApplicants: PendingApplicantResponse[] = [];
  reviewedApplicants: PendingApplicantResponse[] = [];
  isBulkDeleting = false;
  private readonly selectedApplicationIds = new Set<string>();

  ngOnInit(): void {
    const currentUser = authSignal.user();
    const postId = this.route.snapshot.paramMap.get('id')?.trim() ?? '';

    if (!currentUser) {
      this.router.navigateByUrl(ROUTES.AUTH.LOGIN);
      return;
    }

    if (currentUser.role !== 'COMPANY') {
      this.errorMessage = 'Chỉ tài khoản doanh nghiệp mới có thể xem thống kê ứng viên.';
      this.loading = false;
      return;
    }

    if (!postId) {
      this.errorMessage = 'Thiếu mã bài đăng tuyển dụng.';
      this.loading = false;
      return;
    }

    forkJoin({
      post: this.postService.getPostById(postId),
      pendingApplicants: this.postService.getReceivedApplications('PENDING'),
      reviewedApplicants: this.postService.getReceivedApplications('REVIEWED')
    }).subscribe({
      next: ({ post, pendingApplicants, reviewedApplicants }) => {
        if (!post || post.authorId !== currentUser.id) {
          this.errorMessage = 'Không tìm thấy bài đăng hoặc bạn không có quyền xem thống kê này.';
          this.loading = false;
          return;
        }

        this.post = post;
        this.pendingApplicants = pendingApplicants
          .filter((item) => item.postId === postId)
          .map((item) => ({ ...item, status: item.status ?? 'PENDING' }))
          .sort((left, right) => this.sortByAppliedAt(right.appliedAt) - this.sortByAppliedAt(left.appliedAt));
        this.reviewedApplicants = reviewedApplicants
          .filter((item) => item.postId === postId)
          .map((item) => ({ ...item, status: item.status ?? 'REVIEWED' }))
          .sort((left, right) => this.sortByAppliedAt(right.appliedAt) - this.sortByAppliedAt(left.appliedAt));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Không thể tải thống kê ứng viên cho bài đăng này.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  hasApplicantPost(applicant: PendingApplicantResponse): boolean {
    return !!applicant.applicantPostId?.trim();
  }

  hasApplicantCv(applicant: PendingApplicantResponse): boolean {
    return !!applicant.cvUrl?.trim();
  }

  canOpenApplicantDetail(applicant: PendingApplicantResponse): boolean {
    return this.hasApplicantPost(applicant) || this.hasApplicantCv(applicant);
  }

  setApplicantFilter(filter: ApplicantFilter): void {
    this.activeFilter = filter;
  }

  visibleApplicants(): PendingApplicantResponse[] {
    return this.activeFilter === 'REVIEWED' ? this.reviewedApplicants : this.pendingApplicants;
  }

  totalApplicantCount(): number {
    return this.pendingApplicants.length + this.reviewedApplicants.length;
  }

  selectedApplicantCount(): number {
    return this.selectedApplicationIds.size;
  }

  openApplicantPost(applicant: PendingApplicantResponse, event?: Event): void {
    event?.stopPropagation();
    this.recruitmentApplicationViewState.markViewed(applicant.applicationId);

    const applicantPostId = applicant.applicantPostId?.trim();
    if (applicantPostId) {
      this.router.navigateByUrl(ROUTES.RECRUITMENT_DETAIL(applicantPostId), {
        state: {
          returnUrl: this.router.url,
          showActions: false
        }
      });
      return;
    }

    const applicantCvUrl = applicant.cvUrl?.trim();
    if (!applicantCvUrl || typeof window === 'undefined') {
      return;
    }

    window.open(applicantCvUrl, '_blank', 'noopener,noreferrer');
  }

  hasApplicantEmail(applicant: PendingApplicantResponse): boolean {
    return !!applicant.applicantEmail?.trim();
  }

  isApplicantSelected(applicant: PendingApplicantResponse): boolean {
    return this.selectedApplicationIds.has(applicant.applicationId);
  }

  isApplicantViewed(applicant: PendingApplicantResponse): boolean {
    return this.recruitmentApplicationViewState.isViewed(applicant.applicationId);
  }

  hasUnreadApplicants(): boolean {
    return this.recruitmentApplicationViewState.hasUnread(this.allApplicants().map((item) => item.applicationId));
  }

  hasAnyVisibleSelected(): boolean {
    return this.visibleApplicants().some((item) => this.selectedApplicationIds.has(item.applicationId));
  }

  isAllVisibleSelected(): boolean {
    const applicants = this.visibleApplicants();
    return applicants.length > 0 && applicants.every((item) => this.selectedApplicationIds.has(item.applicationId));
  }

  toggleApplicantSelection(applicant: PendingApplicantResponse, event: Event): void {
    event.stopPropagation();

    if (this.selectedApplicationIds.has(applicant.applicationId)) {
      this.selectedApplicationIds.delete(applicant.applicationId);
      return;
    }

    this.selectedApplicationIds.add(applicant.applicationId);
  }

  toggleSelectAllVisible(checked: boolean, event: Event): void {
    event.stopPropagation();

    this.visibleApplicants().forEach((applicant) => {
      if (checked) {
        this.selectedApplicationIds.add(applicant.applicationId);
        return;
      }
      this.selectedApplicationIds.delete(applicant.applicationId);
    });
  }

  contactApplicant(applicant: PendingApplicantResponse, event: Event): void {
    event.stopPropagation();

    const composeUrl = this.buildApplicantComposeUrl(applicant);
    if (!composeUrl || typeof window === 'undefined') {
      return;
    }

    window.open(composeUrl, '_blank', 'noopener');
  }

  deleteSelectedApplicants(): void {
    const applicationIds = Array.from(this.selectedApplicationIds);
    if (applicationIds.length === 0 || this.isBulkDeleting) {
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa ${applicationIds.length} hồ sơ ứng tuyển đã chọn?`);
    if (!confirmed) {
      return;
    }

    this.isBulkDeleting = true;

    forkJoin(applicationIds.map((id) => this.postService.deleteReceivedApplication(id))).subscribe((results) => {
      this.isBulkDeleting = false;

      const deletedIds = applicationIds.filter((_, index) => results[index]);
      if (deletedIds.length === 0) {
        this.errorMessage = 'Không thể xóa các hồ sơ đã chọn.';
        this.cdr.detectChanges();
        return;
      }

      this.removeApplicantsByIds(deletedIds);
      this.errorMessage = '';
      this.noticeMessage = deletedIds.length === applicationIds.length
        ? `Đã xóa ${deletedIds.length} hồ sơ ứng tuyển.`
        : `Đã xóa ${deletedIds.length}/${applicationIds.length} hồ sơ ứng tuyển.`;
      this.cdr.detectChanges();
    });
  }

  postTypeLabel(postType: Post['postType']): string {
    return postType.includes('COMPANY') ? 'Doanh nghiệp' : 'Sinh viên';
  }

  jobTypeLabel(jobType: Post['jobType']): string {
    if (jobType === 'PART_TIME') return 'Bán thời gian';
    if (jobType === 'CONTRACT') return 'Hợp đồng';
    if (jobType === 'INTERNSHIP') return 'Thực tập';
    return 'Toàn thời gian';
  }

  statusLabel(status: Post['status']): string {
    if (status === 'CLOSED') return 'Đã đóng';
    if (status === 'DRAFT') return 'Nháp';
    return 'Đang mở';
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

  private sortByAppliedAt(value?: string | null): number {
    if (!value) {
      return 0;
    }
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private removeApplicantsByIds(applicationIds: string[]): void {
    const deletedIds = new Set(applicationIds);
    this.pendingApplicants = this.pendingApplicants.filter((item) => !deletedIds.has(item.applicationId));
    this.reviewedApplicants = this.reviewedApplicants.filter((item) => !deletedIds.has(item.applicationId));
    applicationIds.forEach((id) => this.selectedApplicationIds.delete(id));
    this.recruitmentApplicationViewState.removeViewed(applicationIds);
  }

  private allApplicants(): PendingApplicantResponse[] {
    return [...this.pendingApplicants, ...this.reviewedApplicants];
  }

  private buildApplicantComposeUrl(applicant: PendingApplicantResponse): string {
    const applicantEmail = applicant.applicantEmail?.trim();
    if (!applicantEmail) {
      return '';
    }

    const applicantName = applicant.applicantName?.trim() || 'bạn';
    const subject = encodeURIComponent('Trao đổi về hồ sơ ứng tuyển');
    const body = encodeURIComponent(
      `Chào ${applicantName},\n\nMình liên hệ để trao đổi thêm về hồ sơ ứng tuyển của bạn.\n\nNếu thuận tiện, bạn vui lòng phản hồi email này để mình trao đổi chi tiết hơn.\n\nTrân trọng,`
    );
    const to = encodeURIComponent(applicantEmail);
    return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${to}&su=${subject}&body=${body}`;
  }
}
