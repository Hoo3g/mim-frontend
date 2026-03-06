import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ResearchPaperService } from '../../core/services/research-paper.service';
import { switchMap } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-research-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
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

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div class="max-w-4xl mx-auto">
          
          <!-- Header -->
          <header class="mb-12 border-b-2 border-hus-blue pb-12">
             <div class="flex items-center gap-3 mb-6 text-[11px] font-bold uppercase tracking-tighter">
              <span class="bg-hus-blue text-white px-3 py-1">{{ paper.category === 'LECTURER' ? 'GIẢNG VIÊN' : 'SINH VIÊN' }}</span>
              <span class="text-gray-300">|</span>
              <span class="text-hus-blue">{{ paper.publicationYear }}</span>
            </div>
            
            <h1 class="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-8">
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
               
               <div class="flex items-center gap-6 pt-4 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                 <span>Tạp chí: <span class="text-hus-blue">{{ paper.journalConference || 'MIM - VNU HUS' }}</span></span>
                 <span>ID: #{{ paper.id.slice(0,8).toUpperCase() }}</span>
               </div>
            </div>
          </header>

          <!-- Main Content Section -->
          <div class="space-y-16">
            
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
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Xem trực tiếp trên trang
                </span>
              </div>
              <div class="aspect-[1.414/1] w-full bg-gray-50 border-2 border-hus-blue/10">
                <iframe
                  [src]="getSafePdfViewerUrl(paper.pdfUrl)"
                  class="w-full h-full"
                  frameborder="0"
                  referrerpolicy="no-referrer"
                  loading="lazy">
                </iframe>
              </div>
            </section>

          </div>

          <!-- Footer Actions -->
          <footer class="mt-20 pt-12 border-t border-gray-100 flex flex-col sm:flex-row justify-center gap-8">
            <a
              [href]="paper.pdfUrl"
              target="_blank"
              rel="noopener noreferrer"
              download
              class="inline-flex items-center justify-center bg-hus-blue text-white text-[11px] font-bold uppercase tracking-[0.2em] px-10 py-4 hover:bg-hus-dark transition shadow-lg shadow-hus-blue/20">
              Tải xuống tài liệu (.PDF)
            </a>
            <button class="border-2 border-hus-blue text-hus-blue text-[11px] font-bold uppercase tracking-[0.2em] px-10 py-4 hover:bg-hus-blue hover:text-white transition">
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
    private paperService = inject(ResearchPaperService);
    private sanitizer = inject(DomSanitizer);

    paper$ = this.route.paramMap.pipe(
        switchMap(params => this.paperService.getPaperById(params.get('id')!))
    );

    getSafePdfViewerUrl(url: string): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildPdfViewerUrl(url));
    }

    private buildPdfViewerUrl(url: string): string {
        if (!url) {
            return '';
        }
        const delimiter = url.includes('#') ? '&' : '#';
        return `${url}${delimiter}toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH`;
    }
}
