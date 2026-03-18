import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NewsItem } from '../../core/models/news.model';
import { NewsService } from '../../core/services/news.service';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent],
  template: `
    <div class="bg-white min-h-screen">
      <div class="border-b border-gray-100 bg-blue-50/50 py-3 px-3 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <a routerLink="/" class="text-hus-blue hover:text-hus-dark transition">Cổng nghiên cứu</a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">Bảng tin khoa</span>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-8 md:py-12">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-widest">Bảng tin khoa</h1>
            <p class="mt-1 text-[11px] text-gray-500 uppercase tracking-widest">
              {{ loading ? 'Đang tải dữ liệu...' : ('Tổng cộng: ' + newsItems.length + ' bản tin') }}
            </p>
          </div>
          
        </div>

        <div *ngIf="loading"
             class="py-16 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
          <app-loading-spinner
            [compact]="true"
            [size]="48">
          </app-loading-spinner>
        </div>

        <div *ngIf="!loading && errorMessage"
             class="border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-xs font-bold uppercase tracking-widest">
          {{ errorMessage }}
        </div>

        <div *ngIf="!loading && !errorMessage && newsItems.length === 0"
             class="py-16 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
          Chưa có bản tin nào.
        </div>

        <div *ngIf="!loading && !errorMessage && newsItems.length > 0" class="grid md:grid-cols-2 gap-4 md:gap-5">
          <article *ngFor="let item of newsItems"
                   class="border border-gray-100 bg-white p-4 sm:p-5 hover:border-hus-blue/40 transition-colors">
            <p class="text-[10px] font-black text-hus-blue opacity-60 uppercase tracking-widest tabular-nums">
              {{ item.createdAt | date:'dd.MM.yyyy' }}
            </p>

            <h2 class="mt-2 text-base sm:text-lg font-black text-gray-900 leading-snug">
              {{ item.title }}
            </h2>

            <p class="mt-3 text-[12px] text-gray-500 leading-relaxed line-clamp-3">
              {{ item.summary || item.content }}
            </p>

            <div class="mt-4 pt-3 border-t border-gray-100">
              <a [routerLink]="['/news', item.id]"
                 class="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-hus-blue hover:text-hus-dark transition-colors">
                Xem chi tiết
                <span aria-hidden="true">›</span>
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  `
})
export class NewsListComponent implements OnInit {
  private readonly newsService = inject(NewsService);

  loading = true;
  errorMessage = '';
  newsItems: NewsItem[] = [];

  ngOnInit(): void {
    this.newsService.getPublicNews().subscribe({
      next: (items) => {
        this.newsItems = items;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải bảng tin khoa.';
        this.loading = false;
      }
    });
  }
}
