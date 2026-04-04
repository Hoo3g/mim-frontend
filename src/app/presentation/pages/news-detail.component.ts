import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { NewsItem, NewsScheduleEntry } from '../../core/models/news.model';
import { NewsService } from '../../core/services/news.service';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';

interface ScheduleTableRow {
    reportRoom: string;
    reportFormat: string;
    reportTime: string;
    entry: NewsScheduleEntry;
    showRoomCell: boolean;
    roomRowSpan: number;
}

@Component({
    selector: 'app-news-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, LoadingSpinnerComponent],
    template: `
    <div class="bg-white min-h-screen">
      <div class="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-8 md:py-12">
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

        <article *ngIf="!loading && !errorMessage && news" class="bg-white p-0 sm:p-8 lg:p-10">
          <div class="flex flex-wrap items-center gap-2">
            <span *ngIf="isScheduleNews()"
                  class="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
              Lịch báo cáo nghiên cứu
            </span>
            <p class="text-[10px] font-black text-hus-blue uppercase tracking-widest">
              {{ news.createdAt | date:'dd.MM.yyyy' }}
            </p>
          </div>

          <h1 class="mt-3 text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight">
            {{ news.title }}
          </h1>

          <p *ngIf="news.summary"
             class="mt-4 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] text-sm text-gray-500 font-semibold leading-relaxed">
            {{ news.summary }}
          </p>

          <img *ngIf="news.imageUrl"
               [src]="news.imageUrl"
               [alt]="news.title"
               class="mt-6 w-full h-56 sm:h-72 object-cover border border-gray-100">

          <div *ngIf="isScheduleNews(); else standardNewsContent" class="mt-8 space-y-8">
            <div *ngIf="scheduleRows.length === 0"
                 class="py-14 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
              Chưa có dữ liệu lịch báo cáo.
            </div>

            <div *ngIf="scheduleRows.length > 0" class="border border-blue-100 bg-white overflow-hidden rounded-sm">
              

              <div class="overflow-x-auto">
                <table class="min-w-full border-collapse">
                  <thead>
                    <tr class="bg-blue-50/60">
                      <th class="px-3 sm:px-4 py-3 text-center align-middle text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-hus-blue border-b border-r border-blue-100">
                        Phòng
                      </th>
                      <th class="px-3 sm:px-4 py-3 text-center align-middle text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-hus-blue border-b border-r border-blue-100">
                        Thời gian
                      </th>
                      <th class="px-4 sm:px-5 py-3 text-center align-middle text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-hus-blue border-b border-r border-blue-100">
                        Tên đề tài
                      </th>
                      <th class="px-3 sm:px-4 py-3 text-center align-middle text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-hus-blue border-b border-blue-100">
                        Hình thức báo cáo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of scheduleRows; let rowIndex = index"
                        class="align-top"
                        [class.bg-gray-50/40]="rowIndex % 2 === 0">
                      <td *ngIf="row.showRoomCell"
                          [attr.rowspan]="row.roomRowSpan"
                          class="px-3 sm:px-4 py-4 border-b border-r border-blue-100 text-center text-sm font-bold text-gray-900 min-w-[140px] align-middle bg-white"
                          [class.border-t-2]="rowIndex > 0"
                          [class.border-t-hus-blue/20]="rowIndex > 0">
                        {{ row.reportRoom }}
                      </td>
                      <td class="px-3 sm:px-4 py-4 border-b border-r border-blue-100 text-center align-middle text-sm font-semibold text-gray-600 min-w-[120px] whitespace-nowrap"
                          [class.border-t-2]="row.showRoomCell && rowIndex > 0"
                          [class.border-t-hus-blue/20]="row.showRoomCell && rowIndex > 0">
                        {{ row.reportTime }}
                      </td>
                      <td class="px-4 sm:px-5 py-4 border-b border-r border-blue-100 min-w-[320px]"
                          [class.border-t-2]="row.showRoomCell && rowIndex > 0"
                          [class.border-t-hus-blue/20]="row.showRoomCell && rowIndex > 0">
                        <a *ngIf="row.entry.paperId; else unmatchedScheduleEntry"
                           [routerLink]="['/paper', row.entry.paperId]"
                           class="block group">
                          <p class="text-sm sm:text-[15px] font-semibold text-gray-900 leading-relaxed group-hover:text-hus-blue transition-colors">
                            {{ row.entry.paperTitle }}
                          </p>
                          
                        </a>
                        <ng-template #unmatchedScheduleEntry>
                          <div>
                            <p class="text-sm sm:text-[15px] font-semibold text-gray-900 leading-relaxed">
                              {{ row.entry.paperTitle }}
                            </p>
                            <p class="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
                              Chưa tìm thấy bài nghiên cứu tương ứng
                            </p>
                          </div>
                        </ng-template>
                      </td>
                      <td class="px-3 sm:px-4 py-4 border-b border-blue-100 text-center align-middle text-[13px] font-semibold text-gray-700 min-w-[180px]"
                          [class.border-t-2]="row.showRoomCell && rowIndex > 0"
                          [class.border-t-hus-blue/20]="row.showRoomCell && rowIndex > 0">
                        {{ row.reportFormat }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <ng-template #standardNewsContent>
            <div class="mt-6 pt-6 border-t border-gray-100">
              <p class="max-w-full overflow-hidden break-words [overflow-wrap:anywhere] text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {{ news.content || news.summary || 'Nội dung đang được cập nhật.' }}
              </p>
            </div>
          </ng-template>

        
        </article>
      </div>
    </div>
  `
})
export class NewsDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly newsService = inject(NewsService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    loading = true;
    errorMessage = '';
    news: NewsItem | null = null;
    scheduleRows: ScheduleTableRow[] = [];

    ngOnInit(): void {
        this.route.paramMap.pipe(
            map((params) => params.get('id')?.trim() || ''),
            distinctUntilChanged(),
            switchMap((newsId) => {
                this.loading = true;
                this.errorMessage = '';
                this.news = null;
                this.scheduleRows = [];

                if (!newsId) {
                    this.errorMessage = 'Không tìm thấy mã tin tức.';
                    this.loading = false;
                    this.cdr.detectChanges();
                    return of(null);
                }

                return this.newsService.getPublicNewsById(newsId);
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe((item) => {
            this.news = item;
            this.scheduleRows = item ? this.buildScheduleRows(item.scheduleEntries ?? []) : [];
            this.loading = false;
            if (!item) {
                this.errorMessage = 'Tin tức không tồn tại hoặc đã bị ẩn.';
            }
            this.cdr.detectChanges();
        });
    }

    isScheduleNews(): boolean {
        return this.news?.contentType === 'RESEARCH_SCHEDULE';
    }

    private buildScheduleRows(entries: NewsScheduleEntry[]): ScheduleTableRow[] {
        if (!entries?.length) {
            return [];
        }

        const rows = [...entries]
            .map((entry) => ({
                reportRoom: (entry.reportRoom ?? '').trim() || 'Chưa rõ phòng',
                reportFormat: (entry.reportFormat ?? '').trim() || 'Chưa rõ hình thức báo cáo',
                reportTime: (entry.reportTime ?? '').trim() || 'Chưa rõ thời gian',
                entry,
                showRoomCell: false,
                roomRowSpan: 1
            }))
            .sort((left, right) => {
                const roomCompare = left.reportRoom.localeCompare(right.reportRoom, 'vi');
                if (roomCompare !== 0) {
                    return roomCompare;
                }
                const reportFormatCompare = left.reportFormat.localeCompare(right.reportFormat, 'vi');
                if (reportFormatCompare !== 0) {
                    return reportFormatCompare;
                }
                const timeCompare = left.reportTime.localeCompare(right.reportTime, 'vi');
                if (timeCompare !== 0) {
                    return timeCompare;
                }
                const leftOrder = left.entry.displayOrder ?? Number.MAX_SAFE_INTEGER;
                const rightOrder = right.entry.displayOrder ?? Number.MAX_SAFE_INTEGER;
                return leftOrder - rightOrder;
            });

        let currentRoom = '';
        let currentStartIndex = -1;
        let currentCount = 0;

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            if (row.reportRoom !== currentRoom) {
                if (currentStartIndex >= 0) {
                    rows[currentStartIndex].showRoomCell = true;
                    rows[currentStartIndex].roomRowSpan = currentCount;
                }
                currentRoom = row.reportRoom;
                currentStartIndex = index;
                currentCount = 1;
                continue;
            }
            currentCount++;
        }

        if (currentStartIndex >= 0) {
            rows[currentStartIndex].showRoomCell = true;
            rows[currentStartIndex].roomRowSpan = currentCount;
        }

        return rows;
    }
}
