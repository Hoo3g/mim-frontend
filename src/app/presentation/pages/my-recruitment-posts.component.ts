import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { Post } from '../../core/models/post.model';
import { PostService } from '../../core/services/post.service';
import { ROUTES } from '../../core/constants/route.const';
import { authSignal } from '../../core/signals/auth.signal';
import { PostDetailComponent } from './post-detail.component';

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

        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1 h-4 bg-hus-blue"></span>
            Danh sách bài đăng của bạn
          </h2>

          <a [routerLink]="ROUTES.RECRUITMENT_EDITOR"
             class="inline-flex items-center justify-center px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-hus-blue hover:bg-hus-dark transition-colors">
            Tạo bài đăng mới
          </a>
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
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div class="min-w-0">
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

                <p class="mt-3 text-[12px] text-gray-500 leading-relaxed line-clamp-2">
                  {{ post.description }}
                </p>

                <p class="mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {{ post.location || 'Chưa cập nhật địa điểm' }}
                  <span *ngIf="post.updatedAt"> | cập nhật {{ post.updatedAt | date:'dd.MM.yyyy' }}</span>
                </p>
              </div>

              <div class="flex items-center gap-2 md:pl-4">
                <button type="button"
                        (click)="openPreview(post)"
                        class="px-4 py-2 border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:border-hus-blue hover:text-hus-blue transition-colors">
                  Xem preview
                </button>
                <button type="button"
                        (click)="editPost(post, $event)"
                        class="px-4 py-2 border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-hus-blue hover:text-white transition-colors">
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <app-post-detail *ngIf="selectedPost"
                       [post]="selectedPost"
                       (close)="closePreview()">
      </app-post-detail>
    </div>
  `
})
export class MyRecruitmentPostsComponent implements OnInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly router = inject(Router);

  protected readonly ROUTES = ROUTES;

  loading = true;
  posts: Post[] = [];
  noticeMessage = '';
  errorMessage = '';
  selectedPost: Post | null = null;

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

    this.postService.getMyPosts(currentUser.id).subscribe({
      next: (posts) => {
        this.posts = posts;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải danh sách bài đăng tuyển dụng.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  openPreview(post: Post): void {
    this.selectedPost = post;
    this.lockBodyScroll();
  }

  closePreview(): void {
    this.selectedPost = null;
    this.unlockBodyScroll();
  }

  editPost(post: Post, event: Event): void {
    event.stopPropagation();
    this.router.navigateByUrl(ROUTES.RECRUITMENT_EDITOR_EDIT(post.id));
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

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = 'auto';
  }
}
