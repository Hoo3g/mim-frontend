import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ROUTES } from '../../core/constants/route.const';
import { Post } from '../../core/models/post.model';
import { PostService } from '../../core/services/post.service';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';
import { PostDetailComponent } from './post-detail.component';

@Component({
  selector: 'app-recruitment-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, PostDetailComponent],
  template: `
    <div *ngIf="loading" class="min-h-screen bg-white flex items-center justify-center px-6">
      <app-loading-spinner [size]="54"></app-loading-spinner>
    </div>

    <div *ngIf="!loading && !post" class="min-h-screen bg-white flex items-start justify-center px-6 pt-16 sm:pt-24">
      <div class="max-w-xl text-center space-y-5">
        <p class="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">
          Không tải được bài tuyển dụng
        </p>
        <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight">
          Bài đăng không tồn tại hoặc chưa sẵn sàng hiển thị
        </h1>
        <p class="text-sm text-gray-500 leading-relaxed">
          Trang chi tiết không lấy được dữ liệu bài tuyển dụng. Bạn có thể quay lại danh sách để thử mở lại bài viết.
        </p>
        <a [routerLink]="fallbackRoute"
           class="inline-flex items-center justify-center bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 hover:bg-hus-dark transition">
          Quay lại tuyển dụng
        </a>
      </div>
    </div>

    <app-post-detail *ngIf="post"
                     [post]="post"
                     [showActions]="showActions"
                     (close)="handleClose()">
    </app-post-detail>
  `
})
export class RecruitmentDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);

  protected readonly fallbackRoute = ROUTES.RECRUITMENT;

  loading = true;
  post: Post | null = null;
  showActions = true;
  private returnUrl: string = ROUTES.RECRUITMENT;

  ngOnInit(): void {
    const postId = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
    const navigationState = (history.state as Record<string, unknown> | null) ?? null;
    const returnUrl = typeof navigationState?.['returnUrl'] === 'string'
      ? navigationState['returnUrl'].trim()
      : '';
    const showActionsState = navigationState?.['showActions'];

    if (returnUrl.startsWith('/')) {
      this.returnUrl = returnUrl;
    }
    if (typeof showActionsState === 'boolean') {
      this.showActions = showActionsState;
    }

    if (!postId) {
      this.loading = false;
      return;
    }

    this.postService.getPostById(postId).subscribe({
      next: (post) => {
        this.post = post ?? null;
        this.loading = false;
      },
      error: () => {
        this.post = null;
        this.loading = false;
      }
    });
  }

  handleClose(): void {
    this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
  }
}
