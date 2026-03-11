import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { NewsItem } from '../../core/models/news.model';
import { NewsService } from '../../core/services/news.service';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-news-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, LoadingSpinnerComponent],
    template: `
    <div class="bg-white min-h-screen">
      <div class="border-b border-gray-100 bg-blue-50/50 py-3 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <a routerLink="/" class="text-hus-blue hover:text-hus-dark transition">Cổng nghiên cứu</a>
          <span class="text-gray-300">/</span>
          <a routerLink="/news" class="text-hus-blue hover:text-hus-dark transition opacity-70">Bảng tin khoa</a>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div *ngIf="loading" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
          <app-loading-spinner
            [compact]="true"
            [size]="50">
          </app-loading-spinner>
        </div>

        <div *ngIf="!loading && errorMessage"
             class="border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-xs font-bold uppercase tracking-widest">
          {{ errorMessage }}
        </div>

        <article *ngIf="!loading && !errorMessage && news" class="bg-white border border-gray-100 p-5 sm:p-8">
          <p class="text-[10px] font-black text-hus-blue uppercase tracking-widest">
            {{ news.createdAt | date:'dd.MM.yyyy' }}
          </p>

          <h1 class="mt-3 text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight">
            {{ news.title }}
          </h1>

          <p *ngIf="news.summary"
             class="mt-4 text-sm text-gray-500 font-semibold leading-relaxed">
            {{ news.summary }}
          </p>

          <img *ngIf="news.imageUrl"
               [src]="news.imageUrl"
               [alt]="news.title"
               class="mt-6 w-full h-56 sm:h-72 object-cover border border-gray-100">

          <div class="mt-6 pt-6 border-t border-gray-100">
            <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {{ news.content || news.summary || 'Nội dung đang được cập nhật.' }}
            </p>
          </div>

          <div class="mt-8 pt-6 border-t border-gray-100">
            <a routerLink="/news"
               class="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-hus-blue hover:text-hus-dark transition-colors">
              <span aria-hidden="true">‹</span>
              Quay lại bảng tin khoa
            </a>
          </div>
        </article>
      </div>
    </div>
  `
})
export class NewsDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly newsService = inject(NewsService);

    loading = true;
    errorMessage = '';
    news: NewsItem | null = null;

    ngOnInit(): void {
        const newsId = this.route.snapshot.paramMap.get('id');
        if (!newsId) {
            this.errorMessage = 'Không tìm thấy mã tin tức.';
            this.loading = false;
            return;
        }

        this.newsService.getPublicNewsById(newsId).subscribe((item) => {
            this.news = item;
            this.loading = false;
            if (!item) {
                this.errorMessage = 'Tin tức không tồn tại hoặc đã bị ẩn.';
            }
        });
    }
}
