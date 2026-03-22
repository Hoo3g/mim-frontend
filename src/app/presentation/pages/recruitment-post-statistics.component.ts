import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ROUTES } from '../../core/constants/route.const';
import { PendingApplicantResponse } from '../../core/models/profile.model';
import { Post } from '../../core/models/post.model';
import { PostService } from '../../core/services/post.service';
import { authSignal } from '../../core/signals/auth.signal';

type ApplicantFilter = 'PENDING' | 'REVIEWED';

@Component({
  selector: 'app-recruitment-post-statistics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="min-h-screen bg-gray-50">
      <div class="mx-auto max-w-6xl px-3 py-8 sm:px-6 lg:px-8 lg:py-10">
        <a [routerLink]="ROUTES.RECRUITMENT_MY_POSTS"
           class="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-hus-blue transition-colors hover:text-hus-dark">
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
          <header class="mt-6 border border-gray-100 bg-white px-5 py-6 sm:px-8 sm:py-8">
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.25em] text-hus-blue">Thống kê ứng viên</p>
              <h1 class="mt-3 max-w-4xl text-2xl font-black leading-tight text-gray-900 sm:text-3xl">
                {{ post.title }}
              </h1>
              <div class="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <span class="text-hus-blue">{{ postTypeLabel(post.postType) }}</span>
                <span>|</span>
                <span>{{ jobTypeLabel(post.jobType) }}</span>
                <span>|</span>
                <span>{{ statusLabel(post.status) }}</span>
                <span>|</span>
                <span>{{ totalApplicantCount() }} hồ sơ đã apply</span>
              </div>
            </div>

            <div class="mt-6 grid gap-4 md:grid-cols-3">
              <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Địa điểm</p>
                <p class="mt-2 text-sm font-bold text-gray-900">{{ post.location || 'Chưa cập nhật' }}</p>
              </div>
              <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Trạng thái duyệt</p>
                <p class="mt-2 text-sm font-bold" [ngClass]="approvalClass(post.approvalStatus)">{{ approvalLabel(post.approvalStatus) }}</p>
              </div>
              <div class="border border-gray-100 bg-gray-50 px-4 py-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Cập nhật gần nhất</p>
                <p class="mt-2 text-sm font-bold text-gray-900">{{ post.updatedAt | date:'dd.MM.yyyy HH:mm' }}</p>
              </div>
            </div>
          </header>

          <section class="mt-6 border border-gray-100 bg-white">
            <div class="flex flex-col gap-2 border-b border-gray-100 px-5 py-5 sm:px-8">
              <h2 class="text-lg font-black text-gray-900">Danh sách sinh viên apply</h2>
              <p class="text-sm text-gray-500">
                Bấm vào từng sinh viên để mở chi tiết bài tuyển dụng công khai của sinh viên đó.
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-3">
                <button type="button"
                        (click)="setApplicantFilter('PENDING')"
                        [ngClass]="activeFilter === 'PENDING' ? 'border-hus-blue bg-blue-50 text-hus-blue' : 'border-gray-200 text-gray-500 hover:border-hus-blue/40 hover:text-hus-blue'"
                        class="inline-flex items-center gap-2 border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors">
                  <span>User apply</span>
                  <span class="rounded-full bg-white px-2 py-0.5 text-[9px] leading-none text-gray-500">
                    {{ pendingApplicants.length }}
                  </span>
                </button>
                <button type="button"
                        (click)="setApplicantFilter('REVIEWED')"
                        [ngClass]="activeFilter === 'REVIEWED' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600'"
                        class="inline-flex items-center gap-2 border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors">
                  <span>Đã được đánh dấu</span>
                  <span class="rounded-full bg-white px-2 py-0.5 text-[9px] leading-none text-gray-500">
                    {{ reviewedApplicants.length }}
                  </span>
                </button>
              </div>
            </div>

            <div *ngIf="visibleApplicants().length === 0"
                 class="px-5 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:px-8">
              {{ activeFilter === 'PENDING' ? 'Chưa có user apply vào bài đăng này.' : 'Chưa có user nào được đánh dấu.' }}
            </div>

            <div *ngIf="visibleApplicants().length > 0" class="divide-y divide-gray-100">
              <article *ngFor="let applicant of visibleApplicants()"
                       (click)="openApplicantPost(applicant)"
                       [ngClass]="hasApplicantPost(applicant) ? 'cursor-pointer hover:bg-blue-50' : ''"
                       class="px-5 py-5 transition-colors sm:px-8">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-3">
                      <h3 class="text-base font-black text-gray-900 [overflow-wrap:anywhere]">
                        {{ applicant.applicantName || 'Sinh viên' }}
                      </h3>
                      <span *ngIf="applicant.status === 'REVIEWED'"
                            class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Đã được đánh dấu
                      </span>
                      <span class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-hus-blue">
                        {{ hasApplicantPost(applicant) ? 'Có bài tuyển dụng' : 'Chưa có bài tuyển dụng công khai' }}
                      </span>
                    </div>

                    <p class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Ứng tuyển {{ applicant.appliedAt | date:'dd.MM.yyyy HH:mm' }}
                    </p>

                    <p *ngIf="applicant.message"
                       class="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-gray-600 [overflow-wrap:anywhere]">
                      {{ applicant.message }}
                    </p>
                  </div>

                  <div class="flex flex-wrap items-center gap-3 lg:justify-end">
                    <button *ngIf="applicant.cvUrl"
                            type="button"
                            (click)="openCvModal(applicant, $event)"
                            class="inline-flex items-center justify-center border border-gray-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-600 transition-colors hover:border-hus-blue hover:text-hus-blue">
                      Xem CV
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </ng-container>
      </div>
    </section>

    <div *ngIf="selectedApplicant && cvSafeUrl"
         class="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 md:p-10">
      <div class="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" (click)="closeCvModal()"></div>

      <div class="relative flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl">
        <div class="pointer-events-none absolute right-3 top-3 z-10">
          <button type="button"
                  (click)="closeCvModal()"
                  class="pointer-events-auto inline-flex h-8 w-8 items-center justify-center bg-white/90 text-gray-400 shadow-sm transition-colors hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="min-h-0 flex-1 bg-gray-100">
          <iframe [src]="cvSafeUrl" class="h-full w-full border-0"></iframe>
        </div>

        <div class="border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
          <p *ngIf="cvActionError"
             class="mb-3 text-[10px] font-bold uppercase tracking-widest text-red-500">
            {{ cvActionError }}
          </p>

          <p *ngIf="selectedApplicant.status === 'REVIEWED'"
             class="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Hồ sơ này đã được đánh dấu.
          </p>

          <div class="flex flex-wrap items-center justify-end gap-3" *ngIf="selectedApplicant.status !== 'REVIEWED'">
            <button type="button"
                    (click)="updateApplicantStatus('REVIEWED')"
                    [disabled]="cvActionLoading"
                    class="inline-flex min-w-[120px] items-center justify-center border border-hus-blue px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-hus-blue transition-colors hover:bg-hus-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
              {{ cvActionLoading && pendingStatusAction === 'REVIEWED' ? 'Đang xử lý...' : 'Đánh dấu' }}
            </button>
            <button type="button"
                    (click)="updateApplicantStatus('REJECTED')"
                    [disabled]="cvActionLoading"
                    class="inline-flex min-w-[120px] items-center justify-center border border-red-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
              {{ cvActionLoading && pendingStatusAction === 'REJECTED' ? 'Đang xử lý...' : 'Loại' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RecruitmentPostStatisticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly ROUTES = ROUTES;

  loading = true;
  errorMessage = '';
  noticeMessage = '';
  post: Post | null = null;
  activeFilter: ApplicantFilter = 'PENDING';
  pendingApplicants: PendingApplicantResponse[] = [];
  reviewedApplicants: PendingApplicantResponse[] = [];
  selectedApplicant: PendingApplicantResponse | null = null;
  cvSafeUrl?: SafeResourceUrl;
  cvActionLoading = false;
  cvActionError = '';
  pendingStatusAction: 'REVIEWED' | 'REJECTED' | null = null;

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
      },
      error: () => {
        this.errorMessage = 'Không thể tải thống kê ứng viên cho bài đăng này.';
        this.loading = false;
      }
    });
  }

  hasApplicantPost(applicant: PendingApplicantResponse): boolean {
    return !!applicant.applicantPostId;
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

  openApplicantPost(applicant: PendingApplicantResponse, event?: Event): void {
    event?.stopPropagation();

    if (!applicant.applicantPostId) {
      return;
    }

    this.router.navigateByUrl(ROUTES.RECRUITMENT_DETAIL(applicant.applicantPostId));
  }

  openCvModal(applicant: PendingApplicantResponse, event: Event): void {
    event.stopPropagation();

    if (!applicant.cvUrl) {
      return;
    }

    this.selectedApplicant = applicant;
    this.cvSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(applicant.cvUrl);
    this.cvActionError = '';
    this.cvActionLoading = false;
    this.pendingStatusAction = null;
  }

  closeCvModal(): void {
    this.selectedApplicant = null;
    this.cvSafeUrl = undefined;
    this.cvActionError = '';
    this.cvActionLoading = false;
    this.pendingStatusAction = null;
  }

  updateApplicantStatus(status: 'REVIEWED' | 'REJECTED'): void {
    const applicant = this.selectedApplicant;
    if (!applicant || this.cvActionLoading) {
      return;
    }

    this.cvActionLoading = true;
    this.pendingStatusAction = status;
    this.cvActionError = '';

    this.postService.updateReceivedApplicationStatus(applicant.applicationId, status).subscribe((success) => {
      if (!success) {
        this.cvActionLoading = false;
        this.pendingStatusAction = null;
        this.cvActionError = 'Không thể cập nhật trạng thái hồ sơ ứng tuyển.';
        return;
      }

      this.pendingApplicants = this.pendingApplicants.filter((item) => item.applicationId !== applicant.applicationId);
      this.reviewedApplicants = this.reviewedApplicants.filter((item) => item.applicationId !== applicant.applicationId);
      if (status === 'REVIEWED') {
        this.reviewedApplicants = [
          { ...applicant, status: 'REVIEWED' },
          ...this.reviewedApplicants
        ].sort((left, right) => this.sortByAppliedAt(right.appliedAt) - this.sortByAppliedAt(left.appliedAt));
      }
      this.noticeMessage = status === 'REVIEWED'
        ? 'Đã đánh dấu hồ sơ ứng tuyển.'
        : 'Đã loại hồ sơ ứng tuyển.';
      this.closeCvModal();
    });
  }

  postTypeLabel(postType: Post['postType']): string {
    return postType.includes('COMPANY') ? 'Doanh nghiệp' : 'Sinh viên';
  }

  jobTypeLabel(jobType: Post['jobType']): string {
    if (jobType === 'PART_TIME') return 'Part-time';
    if (jobType === 'CONTRACT') return 'Hợp đồng';
    if (jobType === 'INTERNSHIP') return 'Thực tập';
    return 'Full-time';
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
}
