import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Post } from '../../core/models/post.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { authSignal } from '../../core/signals/auth.signal';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-post-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" (click)="handleClose()"></div>

      <!-- Modal Content -->
      <div class="relative w-full max-w-4xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in fade-in zoom-in duration-300">
        
        <!-- Left: Visual/Identity (Mobile: Top) -->
        <div class="w-full md:w-80 bg-gray-50 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-100 p-8 flex flex-col items-center text-center">
          <div class="relative mb-6">
            <div class="w-32 h-32 bg-white border-4 border-white shadow-xl overflow-hidden">
              <img *ngIf="post.authorAvatarUrl" [src]="post.authorAvatarUrl" [alt]="post.authorName" class="w-full h-full object-cover">
              <div *ngIf="!post.authorAvatarUrl" class="w-full h-full flex items-center justify-center bg-gray-100 text-3xl font-black text-hus-blue/30 uppercase">
                {{ post.authorName.charAt(0) }}
              </div>
            </div>
            <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-white shadow-lg flex items-center justify-center border border-gray-100">
              <div class="w-4 h-4" [ngClass]="post.postType.includes('COMPANY') ? 'bg-hus-blue' : 'bg-green-500'"></div>
            </div>
          </div>

          <h2 class="text-xl font-black text-gray-900 leading-tight mb-2">{{ post.authorName }}</h2>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 mb-6"
                [ngClass]="post.postType.includes('COMPANY') ? 'bg-blue-50 text-hus-blue' : 'bg-green-50 text-green-600'">
            {{ post.postType.includes('COMPANY') ? 'Đối tác doanh nghiệp' : 'Ứng viên tiềm năng' }}
          </span>

          <div class="w-full space-y-4 text-left pt-6 border-t border-gray-200">
            <div class="flex items-center gap-3 text-xs">
              <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-hus-blue flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="overflow-hidden">
                <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                <p class="font-bold text-gray-900 truncate">{{ post.contactEmail || 'N/A' }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 text-xs">
              <div class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Điện thoại</p>
                <p class="font-bold text-gray-900">{{ post.contactPhone || 'N/A' }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 text-xs">
              <div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Địa điểm</p>
                <p class="font-bold text-gray-900">{{ post.location }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Details (Scrollable) -->
        <div class="flex-grow flex flex-col min-w-0">
          <!-- Header -->
          <div class="p-8 border-b border-gray-100 flex justify-between items-start">
            <div class="pr-8">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-0.5 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest">
                  {{ post.jobType }}
                </span>
                <span class="text-[10px] font-bold text-gray-300 uppercase tracking-widest tabular-nums">
                  Đăng ngày {{ post.createdAt | date:'dd.MM.yyyy' }}
                </span>
              </div>
              <h1 class="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter">{{ post.title }}</h1>
            </div>
            <button (click)="handleClose()" class="p-2 hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l18 18" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
            <!-- Description -->
            <section>
              <h3 class="text-[10px] font-black text-hus-blue uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-hus-blue"></span>
                Giới thiệu chi tiết
              </h3>
              <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line font-medium">
                {{ post.description }}
              </p>
            </section>

            <!-- Requirements/Achievements -->
            <section *ngIf="post.requirements || post.achievements">
              <h3 class="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-gray-900"></span>
                {{ post.postType.includes('COMPANY') ? 'Yêu cầu & Kỹ năng' : 'Thành tích nổi bật' }}
              </h3>
              <div class="bg-gray-50 p-6 border-l-4 border-gray-900">
                <p *ngIf="post.postType.includes('COMPANY')" class="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-medium">
                  {{ post.requirements }}
                </p>
                <ul *ngIf="!post.postType.includes('COMPANY')" class="space-y-3">
                  <li *ngFor="let item of post.achievements?.split(';')" class="flex items-start gap-3">
                    <span class="text-hus-blue font-bold">▪</span>
                    <span class="text-sm text-gray-700 font-medium">{{ item.trim() }}</span>
                  </li>
                </ul>
              </div>
            </section>

            <!-- Student Documents & Research -->
            <section *ngIf="!post.postType.includes('COMPANY') && (post.studentCvUrl || (post.researchPaperLinks && post.researchPaperLinks.length > 0))">
              <h3 class="text-[10px] font-black text-hus-blue uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-hus-blue"></span>
                Hồ sơ & Nghiên cứu
              </h3>
              <div class="space-y-4">
                <!-- CV Link -->
                <div *ngIf="post.studentCvUrl" 
                     (click)="openCv()"
                     class="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100/50 cursor-pointer hover:bg-blue-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-white text-hus-blue shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-[10px] font-black text-gray-900 uppercase tracking-tight">Curriculum Vitae</p>
                      <p class="text-[9px] font-medium text-gray-500">Bản đầy đủ (PDF)</p>
                    </div>
                  </div>
                  <div class="text-[9px] font-black text-hus-blue uppercase tracking-widest">Xem hồ sơ</div>
                </div>

                <!-- Research Papers -->
                <div *ngIf="post.researchPaperLinks && post.researchPaperLinks.length > 0" class="space-y-2">
                  <div *ngFor="let paper of post.researchPaperLinks" 
                       (click)="navigateToResearch(paper.id)"
                       class="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-white text-gray-400 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.584.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div class="min-w-0 pr-4">
                        <p class="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate">{{ paper.title }}</p>
                        <p class="text-[9px] font-medium text-gray-500 uppercase tracking-widest">Ấn phẩm khoa học</p>
                      </div>
                    </div>
                    <div class="text-[9px] font-black text-gray-900 uppercase tracking-widest">Xem bài báo</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Tags -->
            <section *ngIf="post.tags && post.tags.length > 0">
              <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Lĩnh vực & Kỹ năng</h3>
              <div class="flex flex-wrap gap-2">
                <span *ngFor="let tag of post.tags" class="px-3 py-1 bg-white border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  #{{ tag }}
                </span>
              </div>
            </section>

            <!-- Benefits (If Company) -->
            <section *ngIf="post.benefits">
              <h3 class="text-[10px] font-black text-hus-blue uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-hus-blue"></span>
                Quyền lợi hấp dẫn
              </h3>
              <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line font-medium">
                {{ post.benefits }}
              </p>
            </section>
          </div>

          <div *ngIf="post.postType.includes('COMPANY') && isAuth()" class="px-8 pt-6 bg-gray-50/50 border-t border-gray-100">
            <label class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Lời nhắn ứng tuyển (tuỳ chọn)
            </label>
            <textarea [(ngModel)]="applyMessage"
                      rows="3"
                      class="w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-hus-blue"
                      placeholder="Ví dụ: Em mong muốn trao đổi thêm về yêu cầu vị trí..."></textarea>
            <p *ngIf="applyFeedback"
               class="mt-2 text-[10px] font-bold uppercase tracking-widest"
               [ngClass]="applyError ? 'text-red-500' : 'text-emerald-600'">
              {{ applyFeedback }}
            </p>
            <a *ngIf="missingDefaultCv"
               [routerLink]="['/profile']"
               (click)="handleClose()"
               class="mt-2 inline-block text-[10px] font-black uppercase tracking-widest text-hus-blue hover:underline">
              Tải CV mặc định tại Profile
            </a>
          </div>

          <!-- Footer Actions -->
          <div class="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
            <button (click)="handlePrimaryAction()"
                    class="flex-grow py-4 bg-gray-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-hus-blue transition-all duration-300 transform active:scale-95 shadow-lg shadow-gray-900/10">
              {{ post.postType.includes('COMPANY') ? (isAuth() ? 'Ứng tuyển ngay' : 'Đăng nhập để ứng tuyển') : 'Liên hệ hợp tác' }}
            </button>
            <button class="px-8 py-4 bg-white border border-gray-200 text-gray-500 text-[11px] font-black uppercase tracking-widest hover:border-hus-blue hover:text-hus-blue transition-all duration-300">
              Lưu tin
            </button>
          </div>
        </div>
      </div>

      <!-- Separate CV Modal Window -->
      <div *ngIf="showCv" class="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
        <!-- CV Backdrop -->
        <div class="absolute inset-0 bg-gray-900/80 backdrop-blur-md" (click)="showCv = false"></div>
        
        <!-- CV Modal Content -->
        <div class="relative w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col animate-in zoom-in duration-300">
          <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-hus-blue flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 class="text-[10px] font-black text-gray-900 uppercase tracking-widest">Curriculum Vitae</h4>
                <p class="text-[9px] font-medium text-gray-500 uppercase">{{ post.authorName }}</p>
              </div>
            </div>
            <button (click)="showCv = false" class="flex items-center gap-2 group">
              <span class="text-[10px] font-black text-hus-blue uppercase tracking-widest group-hover:underline">Đóng</span>
              <div class="w-6 h-6 flex items-center justify-center bg-blue-50 text-hus-blue group-hover:bg-hus-blue group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </button>
          </div>
          <div class="flex-grow bg-gray-200 overflow-hidden">
            <iframe [src]="cvSafeUrl" class="w-full h-full border-none"></iframe>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #e2e2e2;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #999;
    }
  `]
})
export class PostDetailComponent {
    private sanitizer = inject(DomSanitizer);
    private router = inject(Router);
    private postService = inject(PostService);

    @Input({ required: true }) post!: Post;
    @Output() close = new EventEmitter<void>();

    isAuth = authSignal.isAuth;
    showCv = false;
    cvSafeUrl?: SafeResourceUrl;
    applyMessage = '';
    applyFeedback = '';
    applyError = false;
    missingDefaultCv = false;

    openCv(): void {
        if (this.post.studentCvUrl) {
            this.cvSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.post.studentCvUrl);
            this.showCv = true;
        }
    }

    navigateToResearch(id?: string): void {
        if (id) {
            this.close.emit();
            this.router.navigate(['/paper', id]);
        }
    }

    handleClose(): void {
        this.showCv = false;
        this.close.emit();
    }

    handlePrimaryAction(): void {
        if (!this.post.postType.includes('COMPANY')) {
            return;
        }

        if (!this.isAuth()) {
            this.close.emit();
            this.router.navigate(['/auth/login']);
            return;
        }

        this.applyFeedback = '';
        this.applyError = false;
        this.missingDefaultCv = false;

        this.postService.applyToPost(this.post.id, { message: this.applyMessage }).subscribe({
            next: () => {
                this.applyFeedback = 'Ứng tuyển thành công';
                this.applyMessage = '';
                this.applyError = false;
                this.missingDefaultCv = false;
            },
            error: (error: HttpErrorResponse) => {
                const message = error.error?.message || 'Ứng tuyển thất bại';
                this.applyFeedback = String(message);
                this.applyError = true;
                this.missingDefaultCv = String(message).toLowerCase().includes('default cv');
            }
        });
    }
}
