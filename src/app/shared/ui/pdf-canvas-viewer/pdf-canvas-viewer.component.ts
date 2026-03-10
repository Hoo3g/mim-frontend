import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  signal,
  viewChild
} from '@angular/core';
import {
  GlobalWorkerOptions,
  getDocument,
  version as pdfjsVersion,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask
} from 'pdfjs-dist';

@Component({
  selector: 'app-pdf-canvas-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-white">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          (click)="prevPage()"
          [disabled]="isLoading() || page() <= 1"
          class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-hus-blue hover:text-hus-blue transition-colors"
        >
          Trang trước
        </button>

        <div class="px-2 text-[11px] font-semibold text-gray-700 min-w-28 text-center">
          {{ totalPages() > 0 ? ('Trang ' + page() + ' / ' + totalPages()) : 'Chưa có trang' }}
        </div>

        <button
          type="button"
          (click)="nextPage()"
          [disabled]="isLoading() || page() >= totalPages()"
          class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-hus-blue hover:text-hus-blue transition-colors"
        >
          Trang sau
        </button>

        <div class="w-px h-6 bg-gray-200 mx-1"></div>

        <button
          type="button"
          (click)="zoomOut()"
          [disabled]="isLoading() || zoom() <= MIN_ZOOM"
          class="w-8 h-8 inline-flex items-center justify-center text-lg leading-none border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-hus-blue hover:text-hus-blue transition-colors"
        >
          -
        </button>

        <div class="px-1 text-[11px] font-semibold text-gray-700 min-w-16 text-center">
          {{ zoomPercent() }}%
        </div>

        <button
          type="button"
          (click)="zoomIn()"
          [disabled]="isLoading() || zoom() >= MAX_ZOOM"
          class="w-8 h-8 inline-flex items-center justify-center text-lg leading-none border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-hus-blue hover:text-hus-blue transition-colors"
        >
          +
        </button>
      </div>

      <div class="relative flex-1 overflow-auto bg-gray-100">
        @if (isLoading()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <p class="text-[11px] font-bold uppercase tracking-widest text-gray-500">
              Đang tải tài liệu...
            </p>
          </div>
        }

        @if (!!errorMessage()) {
          <div class="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 bg-white">
            <p class="text-sm font-bold uppercase tracking-widest text-gray-500">
              Không thể hiển thị PDF
            </p>
            <p class="mt-2 text-xs text-gray-500 max-w-md">
              {{ errorMessage() }}
            </p>
            <button
              type="button"
              (click)="openInNewTab()"
              class="mt-4 inline-flex items-center justify-center border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:bg-hus-blue hover:text-white transition-colors"
            >
              Mở PDF ở tab mới
            </button>
          </div>
        }

        <div class="min-h-full flex items-start justify-center p-4 sm:p-6">
          <canvas #pdfCanvas class="shadow-xl border border-gray-200 bg-white"></canvas>
        </div>
      </div>
    </div>
  `
})
export class PdfCanvasViewerComponent implements AfterViewInit, OnDestroy {
  readonly MIN_ZOOM = 0.6;
  readonly MAX_ZOOM = 2.8;

  src = input<string>('');
  title = input<string>('Tài liệu PDF');

  isLoading = signal<boolean>(false);
  isRendering = signal<boolean>(false);
  page = signal<number>(1);
  totalPages = signal<number>(0);
  zoom = signal<number>(1.1);
  errorMessage = signal<string>('');
  zoomPercent = signal<number>(110);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');
  private readonly pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  private pdfDocument: PDFDocumentProxy | null = null;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private renderTask: RenderTask | null = null;
  private isViewReady = false;
  private loadToken = 0;
  private renderToken = 0;
  private isDestroyed = false;

  constructor() {
    effect(() => {
      const source = this.src();
      if (!this.isViewReady || this.isDestroyed) {
        return;
      }
      void this.loadDocument(source);
    });
  }

  ngAfterViewInit(): void {
    this.isViewReady = true;
    void this.loadDocument(this.src());
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.loadToken += 1;
    this.renderToken += 1;
    void this.disposeDocument();
  }

  prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    void this.renderPage(this.page() - 1);
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    void this.renderPage(this.page() + 1);
  }

  zoomIn(): void {
    if (this.zoom() >= this.MAX_ZOOM) {
      return;
    }
    const value = Math.min(this.MAX_ZOOM, this.zoom() + 0.2);
    this.zoom.set(Number(value.toFixed(2)));
    this.zoomPercent.set(Math.round(this.zoom() * 100));
    void this.renderPage(this.page());
  }

  zoomOut(): void {
    if (this.zoom() <= this.MIN_ZOOM) {
      return;
    }
    const value = Math.max(this.MIN_ZOOM, this.zoom() - 0.2);
    this.zoom.set(Number(value.toFixed(2)));
    this.zoomPercent.set(Math.round(this.zoom() * 100));
    void this.renderPage(this.page());
  }

  openInNewTab(): void {
    const source = this.src().trim();
    if (!source) {
      return;
    }
    window.open(source, '_blank', 'noopener');
  }

  private async loadDocument(rawSource: string): Promise<void> {
    const source = (rawSource ?? '').trim();
    const token = ++this.loadToken;

    this.errorMessage.set('');
    this.isLoading.set(true);
    this.totalPages.set(0);
    this.page.set(1);

    await this.disposeDocument();

    if (!source) {
      if (token === this.loadToken) {
        this.isLoading.set(false);
      }
      return;
    }

    try {
      this.configureWorker();

      this.loadingTask = getDocument({
        url: source,
        withCredentials: false
      });

      const document = await this.loadingTask.promise;
      if (token !== this.loadToken || this.isDestroyed) {
        await document.destroy();
        return;
      }

      this.pdfDocument = document;
      this.totalPages.set(document.numPages);
      this.page.set(1);
      await this.renderPage(1);
    } catch (error) {
      if (token === this.loadToken && !this.isDestroyed) {
        this.errorMessage.set(this.resolveLoadErrorMessage(error));
      }
    } finally {
      if (token === this.loadToken) {
        this.isLoading.set(false);
      }
    }
  }

  private async renderPage(pageNumber: number): Promise<void> {
    if (!this.pdfDocument || this.isDestroyed) {
      return;
    }

    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    const clampedPage = Math.max(1, Math.min(pageNumber, this.totalPages()));
    this.page.set(clampedPage);

    const token = ++this.renderToken;
    this.isRendering.set(true);
    this.errorMessage.set('');

    await this.cancelRenderTask();

    try {
      const page = await this.pdfDocument.getPage(clampedPage);
      if (token !== this.renderToken || this.isDestroyed) {
        return;
      }

      const viewport = page.getViewport({ scale: this.zoom() });
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        throw new Error('Không thể tạo canvas context');
      }

      canvas.width = Math.floor(viewport.width * this.pixelRatio);
      canvas.height = Math.floor(viewport.height * this.pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);

      this.renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport
      });

      await this.renderTask.promise;
    } catch (error) {
      if (!this.isRenderCancelled(error)) {
        this.errorMessage.set(this.resolveLoadErrorMessage(error));
      }
    } finally {
      if (token === this.renderToken) {
        this.isRendering.set(false);
      }
      this.renderTask = null;
    }
  }

  private async disposeDocument(): Promise<void> {
    try {
      await this.cancelRenderTask();
    } catch {
      // no-op
    }

    if (this.loadingTask) {
      await this.loadingTask.destroy();
      this.loadingTask = null;
    }

    if (this.pdfDocument) {
      await this.pdfDocument.destroy();
      this.pdfDocument = null;
    }
  }

  private async cancelRenderTask(): Promise<void> {
    if (!this.renderTask) {
      return;
    }
    this.renderTask.cancel();
    try {
      await this.renderTask.promise;
    } catch {
      // ignore cancellation errors
    }
    this.renderTask = null;
  }

  private configureWorker(): void {
    if (typeof window === 'undefined' || GlobalWorkerOptions.workerSrc) {
      return;
    }
    GlobalWorkerOptions.workerSrc = `/assets/pdfjs/pdf.worker.min.mjs?v=${encodeURIComponent(pdfjsVersion)}`;
  }

  private resolveLoadErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'Trình duyệt không thể tải file PDF theo cơ chế viewer. Bạn có thể mở tài liệu ở tab mới.';
  }

  private isRenderCancelled(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return error.name === 'RenderingCancelledException' || error.name === 'AbortException';
  }
}
