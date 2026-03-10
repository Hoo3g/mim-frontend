import { Component, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ResearchPaperService } from '../../core/services/research-paper.service';
import { Observable, finalize, switchMap } from 'rxjs';
import { ResearchPaper } from '../../core/models/research-paper.model';
import { authSignal } from '../../core/signals/auth.signal';
import { API_CONFIG } from '../../core/config/api.config';
import { PdfCanvasViewerComponent } from '../../shared/ui/pdf-canvas-viewer/pdf-canvas-viewer.component';

@Component({
  selector: 'app-research-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PdfCanvasViewerComponent],
  template: `
    <div *ngIf="paper$ | async as paper" class="min-h-screen bg-white pb-20">
      
      <!-- Minimal Navigation Bar - Blue Tint -->
      <div class="border-b border-gray-100 bg-blue-50/50 py-3 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <a routerLink="/" class="text-hus-blue hover:text-hus-dark transition">Cổng nghiên cứu</a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">{{ paper.researchArea }}</span>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
        <div class="max-w-4xl mx-auto">
          
          <!-- Header -->
          <header class="mb-8 sm:mb-12 border-b-2 border-hus-blue pb-8 sm:pb-12">
            <div class="flex items-center gap-3 mb-6 text-[11px] font-bold uppercase tracking-tighter">
              <span class="bg-hus-blue text-white px-3 py-1">{{ paper.category === 'LECTURER' ? 'GIẢNG VIÊN' : 'SINH VIÊN' }}</span>
              <span class="text-gray-300">|</span>
              <span class="text-hus-blue">{{ paper.publicationYear }}</span>
              <button *ngIf="isAuth()"
                      (click)="toggleBookmark(paper)"
                      class="ml-auto w-9 h-9 inline-flex items-center justify-center border transition-colors"
                      [attr.aria-label]="paper.isBookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'"
                      [attr.title]="paper.isBookmarked ? 'Đã lưu' : 'Lưu bài'"
                      [ngClass]="paper.isBookmarked ? 'border-hus-blue bg-blue-50 text-hus-blue' : 'border-gray-200 text-gray-400 hover:border-hus-blue hover:text-hus-blue'">
                <svg xmlns="http://www.w3.org/2000/svg"
                     class="h-4 w-4"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                     stroke-width="1.5"
                     aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6 sm:mb-8">
              {{ paper.title }}
            </h1>
            
            <div class="flex flex-col gap-6">
               <div class="flex flex-wrap gap-4 items-center">
                 <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tác giả biên soạn:</span>
                 <div class="flex flex-wrap gap-x-6 gap-y-2">
                   <div *ngFor="let author of paper.authors" class="text-sm font-bold text-gray-900">
                     {{ author.name }}
                     <span *ngIf="author.isMainAuthor" class="ml-1 text-[9px] text-hus-blue uppercase tracking-tighter font-black">(Chủ biên)</span>
                   </div>
                 </div>
               </div>
               
               <div class="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                 <span>Tạp chí: <span class="text-hus-blue">{{ paper.journalConference || 'MIM - VNU HUS' }}</span></span>
                 <span>ID: #{{ paper.id.slice(0,8).toUpperCase() }}</span>
               </div>
            </div>
          </header>

          <!-- Main Content Section -->
          <div class="space-y-10 sm:space-y-16">
            
            <!-- Abstract Block -->
            <section>
              <h2 class="text-[11px] font-bold text-hus-blue uppercase tracking-[0.2em] mb-6 inline-block border-b-4 border-hus-blue pb-1">
                Tóm tắt Nghiên cứu
              </h2>
              <div class="text-lg text-gray-700 leading-relaxed text-justify font-light whitespace-pre-line"
                   [innerHTML]="paper.abstract"></div>
            </section>

            <!-- Document View -->
            <section>
              <div class="flex justify-between items-baseline mb-6">
                <h2 class="text-[11px] font-bold text-hus-blue uppercase tracking-[0.2em] inline-block border-b-4 border-hus-blue pb-1">
                  Văn bản chi tiết (PDF)
                </h2>
                
              </div>
              <div class="w-full h-[72vh] md:h-[82vh] lg:h-[90vh] min-h-[420px] sm:min-h-[560px] bg-gray-50 border-2 border-hus-blue/10">
                <app-pdf-canvas-viewer *ngIf="hasPdfUrl(paper.pdfUrl); else missingInlinePdf"
                                       [src]="getDownloadUrl(paper.pdfUrl)"
                                       [title]="paper.title"
                                       class="block w-full h-full">
                </app-pdf-canvas-viewer>
                <ng-template #missingInlinePdf>
                  <div class="w-full h-full flex flex-col items-center justify-center text-center px-6">
                    <p class="text-sm font-bold uppercase tracking-widest text-gray-400">
                      Chưa có PDF để hiển thị.
                    </p>
                    <p class="mt-2 text-xs text-gray-500 max-w-md">
                      Bài nghiên cứu hiện chưa có file PDF công khai.
                    </p>
                  </div>
                </ng-template>
              </div>
            </section>

          </div>

          <!-- Footer Actions -->
          <footer class="mt-8 sm:mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button *ngIf="hasPdfUrl(paper.pdfUrl); else missingPdf"
               type="button"
               (click)="downloadPdf(paper.pdfUrl, paper.title)"
               [disabled]="isDownloadingPdf"
               class="inline-flex items-center justify-center bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 hover:bg-hus-dark transition shadow-lg shadow-hus-blue/20 w-full sm:w-auto">
              {{ isDownloadingPdf ? 'Đang tải xuống...' : 'Tải xuống tài liệu (.PDF)' }}
            </button>
            <ng-template #missingPdf>
              <button type="button"
                      disabled
                      class="inline-flex items-center justify-center bg-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 cursor-not-allowed">
                Chưa có tệp PDF
              </button>
            </ng-template>
            <button class="border-2 border-hus-blue text-hus-blue text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 hover:bg-hus-blue hover:text-white transition w-full sm:w-auto">
              Liên hệ tác giả
            </button>
          </footer>

        </div>
      </div>
    </div>
  `
})
export class ResearchDetailComponent {
  private route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private paperService = inject(ResearchPaperService);
  private readonly frontendOrigin = this.resolveOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  private readonly backendOrigin = this.resolveOrigin(API_CONFIG.BASE_URL);
  private readonly frontendProtocol = this.resolveProtocol(this.frontendOrigin);
  private readonly backendHost = this.resolveHost(this.backendOrigin);
  isAuth = authSignal.isAuth;
  isDownloadingPdf = false;

  paper$: Observable<ResearchPaper | undefined> = this.route.paramMap.pipe(
    switchMap(params => this.paperService.getPaperById(params.get('id')!))
  );

  toggleBookmark(paper: ResearchPaper): void {
    const request$ = paper.isBookmarked
      ? this.paperService.unbookmarkPaper(paper.id)
      : this.paperService.bookmarkPaper(paper.id);

    request$.subscribe({
      next: () => {
        this.paper$ = this.route.paramMap.pipe(
          switchMap(params => this.paperService.getPaperById(params.get('id')!))
        );
      }
    });
  }

  getDownloadUrl(url: string): string {
    return this.resolvePdfUrl(url);
  }

  hasPdfUrl(url: string): boolean {
    return !!this.getDownloadUrl(url);
  }

  downloadPdf(url: string, title: string): void {
    const resolved = this.getDownloadUrl(url);
    if (!resolved || this.isDownloadingPdf) {
      return;
    }

    this.isDownloadingPdf = true;
    this.http.get(resolved, { observe: 'response', responseType: 'blob' })
      .pipe(finalize(() => {
        this.isDownloadingPdf = false;
      }))
      .subscribe({
        next: (response) => this.saveBlob(response, resolved, title),
        error: () => window.open(resolved, '_blank', 'noopener')
      });
  }

  private resolvePdfUrl(rawUrl: string): string {
    const value = (rawUrl ?? '').trim();
    if (!value) {
      return '';
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return this.normalizePdfProtocol(
        value.replace('/api/v1/storage/research-pdfs/', '/api/public/storage/research-pdfs/')
      );
    }

    if (value.startsWith('/api/public/storage/research-pdfs/')) {
      return `${API_CONFIG.BASE_URL}${value}`;
    }

    if (value.startsWith('/api/v1/storage/research-pdfs/')) {
      return `${API_CONFIG.BASE_URL}${value.replace('/api/v1/storage/research-pdfs/', '/api/public/storage/research-pdfs/')}`;
    }

    if (value.startsWith('/')) {
      return `${API_CONFIG.BASE_URL}${value}`;
    }

    // Backward compatibility: old records may store only MinIO object key.
    return `${API_CONFIG.BASE_URL}/api/public/storage/research-pdfs/${encodeURIComponent(value)}`;
  }

  private resolveOrigin(url: string): string {
    try {
      return new URL(url).origin;
    } catch {
      return '';
    }
  }

  private resolveProtocol(origin: string): string {
    try {
      return new URL(origin).protocol;
    } catch {
      return '';
    }
  }

  private resolveHost(origin: string): string {
    try {
      return new URL(origin).host;
    } catch {
      return '';
    }
  }

  private normalizePdfProtocol(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:') {
        return url;
      }

      // Production traffic is HTTPS via Cloudflare/nginx. Convert legacy stored links
      // that still use http://api... so browser can embed/download without mixed-content issues.
      if (this.frontendProtocol === 'https:' && !!this.backendHost && parsed.host === this.backendHost) {
        parsed.protocol = 'https:';
        return parsed.toString();
      }
    } catch {
      return url;
    }

    return url;
  }

  private saveBlob(response: HttpResponse<Blob>, resolvedUrl: string, title: string): void {
    const blob = response.body;
    if (!blob || blob.size === 0) {
      return;
    }

    const filename = this.resolveDownloadFilename(response, resolvedUrl, title);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  private resolveDownloadFilename(response: HttpResponse<Blob>, resolvedUrl: string, title: string): string {
    const disposition = response.headers.get('content-disposition') ?? '';
    const utf8FilenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8FilenameMatch?.[1]) {
      return decodeURIComponent(utf8FilenameMatch[1]);
    }

    const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    if (filenameMatch?.[1]) {
      return filenameMatch[1];
    }

    const pathname = resolvedUrl.split('#')[0].split('?')[0];
    const urlName = pathname.split('/').pop() ?? '';
    if (urlName.toLowerCase().endsWith('.pdf')) {
      return urlName;
    }

    const safeTitle = (title ?? '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ');
    return `${safeTitle || 'tai-lieu'}.pdf`;
  }
}
