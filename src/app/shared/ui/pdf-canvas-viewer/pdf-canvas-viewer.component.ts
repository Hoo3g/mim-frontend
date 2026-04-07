import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  inject,
  input,
  signal,
  viewChild,
  viewChildren
} from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask
} from 'pdfjs-dist';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-pdf-canvas-viewer',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <div class="h-full flex flex-col bg-white">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div class="px-1 text-[11px] font-semibold text-gray-700 min-w-28 text-left">
          {{ totalPages() > 0 ? ('Trang ' + page() + ' / ' + totalPages()) : 'Chưa có trang' }}
        </div>

        

        <div class="w-px h-6 bg-gray-200 mx-1 ml-auto"></div>

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

      <div
        #scrollContainer
        class="relative flex-1 overflow-auto bg-gray-100"
        (scroll)="onViewerScroll()"
      >
        @if (isLoading()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <div class="flex flex-col items-center justify-center px-6 text-center">
              <app-loading-spinner
                [compact]="true"
                [size]="46">
              </app-loading-spinner>
              @if (!!slowLoadingHint()) {
                <p class="mt-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  {{ slowLoadingHint() }}
                </p>
              }
            </div>
          </div>
        }

        @if (isRendering() && !isLoading() && !errorMessage()) {
          <div class="pointer-events-none absolute right-3 top-3 z-10">
            <div class="rounded-full border border-hus-blue/15 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-hus-blue shadow-sm">
              Đang hiển thị PDF...
            </div>
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

        <div #pagesContainer class="min-h-full p-1.5 sm:p-6 space-y-2 sm:space-y-4">
          @for (pageNumber of pageNumbers(); track pageNumber) {
            <div class="flex justify-center">
              <canvas
                #pdfPageCanvas
                [attr.data-page]="pageNumber"
                class="shadow-xl border border-gray-200 bg-white"
              ></canvas>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class PdfCanvasViewerComponent implements AfterViewInit, OnDestroy {
  readonly MIN_ZOOM = 0.3;
  readonly MAX_ZOOM = 2.8;
  private readonly RESIZE_WIDTH_DELTA_THRESHOLD = 4;
  private readonly PDF_LOAD_STALL_TIMEOUT_MS = 25000;
  private readonly PDF_LOAD_MAX_TOTAL_MS = 180000;
  private readonly PDF_FALLBACK_FETCH_TIMEOUT_MS = 120000;
  private readonly PDF_RANGE_CHUNK_SIZE = 64 * 1024;
  private readonly SLOW_HINT_DELAY_MS = 3500;

  src = input<string>('');
  title = input<string>('Tài liệu PDF');

  isLoading = signal<boolean>(false);
  isRendering = signal<boolean>(false);
  page = signal<number>(1);
  totalPages = signal<number>(0);
  pageNumbers = signal<number[]>([]);
  zoom = signal<number>(1.1);
  errorMessage = signal<string>('');
  slowLoadingHint = signal<string>('');
  zoomPercent = signal<number>(110);

  private readonly scrollContainerRef = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  private readonly pagesContainerRef = viewChild<ElementRef<HTMLDivElement>>('pagesContainer');
  private readonly pageCanvasRefs = viewChildren<ElementRef<HTMLCanvasElement>>('pdfPageCanvas');
  private readonly http = inject(HttpClient);
  private readonly pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  private pdfDocument: PDFDocumentProxy | null = null;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private readonly renderTasks = new Map<number, RenderTask>();
  private isViewReady = false;
  private loadToken = 0;
  private renderToken = 0;
  private isDestroyed = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private workerFallbackPromise: Promise<void> | null = null;
  private lastMeasuredContainerWidth = 0;
  private slowLoadingHintTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.slowLoadingHintTimer) {
      clearTimeout(this.slowLoadingHintTimer);
      this.slowLoadingHintTimer = null;
    }
    void this.disposeDocument();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.pdfDocument || this.isDestroyed) {
      return;
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      void this.handleStableResize();
    }, 120);
  }

  zoomIn(): void {
    if (this.zoom() >= this.MAX_ZOOM) {
      return;
    }
    const value = Math.min(this.MAX_ZOOM, this.zoom() + 0.2);
    this.zoom.set(Number(value.toFixed(2)));
    this.zoomPercent.set(Math.round(this.zoom() * 100));
    void this.renderAllPages();
  }

  zoomOut(): void {
    if (this.zoom() <= this.MIN_ZOOM) {
      return;
    }
    const value = Math.max(this.MIN_ZOOM, this.zoom() - 0.2);
    this.zoom.set(Number(value.toFixed(2)));
    this.zoomPercent.set(Math.round(this.zoom() * 100));
    void this.renderAllPages();
  }

  openInNewTab(): void {
    const source = this.src().trim();
    if (!source) {
      return;
    }
    window.open(source, '_blank', 'noopener');
  }

  onViewerScroll(): void {
    this.updateCurrentPageFromScroll();
  }

  private async loadDocument(rawSource: string): Promise<void> {
    const source = (rawSource ?? '').trim();
    const token = ++this.loadToken;

    this.errorMessage.set('');
    this.slowLoadingHint.set('');
    this.isLoading.set(true);
    this.totalPages.set(0);
    this.pageNumbers.set([]);
    this.page.set(1);
    this.scheduleSlowLoadingHint();

    await this.disposeDocument();

    if (!source) {
      if (token === this.loadToken) {
        this.isLoading.set(false);
      }
      return;
    }

    try {
      this.configureWorker();

      const document = await this.openDocumentWithFallback(source, token);
      if (token !== this.loadToken || this.isDestroyed) {
        await document.destroy();
        return;
      }

      this.pdfDocument = document;
      this.totalPages.set(document.numPages);
      this.pageNumbers.set(Array.from({ length: document.numPages }, (_, index) => index + 1));
      this.page.set(1);
      await this.applyFitToWidth(document, token);
      void this.renderAllPages();
      this.updateCurrentPageFromScroll();
    } catch (error) {
      if (token === this.loadToken && !this.isDestroyed) {
        this.errorMessage.set(this.resolveLoadErrorMessage(error));
      }
    } finally {
      this.clearSlowLoadingHintTimer();
      if (token === this.loadToken) {
        this.isLoading.set(false);
        this.slowLoadingHint.set('');
      }
    }
  }

  private async openDocumentWithFallback(source: string, token: number): Promise<PDFDocumentProxy> {
    this.loadingTask = this.createLoadingTask(source);

    try {
      return await this.waitForLoadingTask(this.loadingTask);
    } catch (primaryError) {
      if (token !== this.loadToken || this.isDestroyed) {
        throw primaryError;
      }

      if (this.loadingTask) {
        await this.loadingTask.destroy();
        this.loadingTask = null;
      }

      if (this.isWorkerBootstrapError(primaryError)) {
        try {
          await this.ensureMainThreadWorkerFallback();
          this.loadingTask = this.createLoadingTask(source);
          return await this.waitForLoadingTask(this.loadingTask);
        } catch {
          if (this.loadingTask) {
            await this.loadingTask.destroy();
            this.loadingTask = null;
          }
        }
      }

      try {
        const arrayBuffer = await firstValueFrom<ArrayBuffer>(this.http.get(source, {
          responseType: 'arraybuffer',
          withCredentials: true
        }).pipe(
          timeout(this.PDF_FALLBACK_FETCH_TIMEOUT_MS)
        ));
        const bytes = new Uint8Array(arrayBuffer);
        if (bytes.byteLength <= 0) {
          throw new Error('Không thể tải PDF');
        }
        this.loadingTask = getDocument({ data: bytes });
        return await this.waitForLoadingTask(this.loadingTask);
      } catch {
        try {
          const fallbackTask = this.createLoadingTask(source);
          this.loadingTask = fallbackTask;
          return await this.waitForLoadingTask(fallbackTask);
        } catch {
          throw primaryError;
        }
      }
    }
  }

  private async fitWidthAndRerender(): Promise<void> {
    if (!this.pdfDocument || this.isDestroyed) {
      return;
    }
    const token = this.loadToken;
    const zoomChanged = await this.applyFitToWidth(this.pdfDocument, token);
    if (zoomChanged) {
      await this.renderAllPages();
    }
    this.updateCurrentPageFromScroll();
  }

  private async handleStableResize(): Promise<void> {
    this.resizeTimer = null;
    const container = this.scrollContainerRef()?.nativeElement;
    if (!container || !this.pdfDocument || this.isDestroyed) {
      return;
    }

    const currentWidth = container.clientWidth;
    if (currentWidth <= 0) {
      return;
    }

    // Mobile browsers fire resize when the address bar hides/shows while scrolling.
    // Ignore those height-only viewport changes to avoid repaint flicker.
    if (
      this.lastMeasuredContainerWidth > 0 &&
      Math.abs(currentWidth - this.lastMeasuredContainerWidth) < this.RESIZE_WIDTH_DELTA_THRESHOLD
    ) {
      return;
    }

    await this.fitWidthAndRerender();
  }

  private async applyFitToWidth(document: PDFDocumentProxy, token: number): Promise<boolean> {
    if (this.isDestroyed || token !== this.loadToken || document.numPages <= 0) {
      return false;
    }

    const container = this.scrollContainerRef()?.nativeElement;
    const pagesContainer = this.pagesContainerRef()?.nativeElement;
    if (!container || !pagesContainer) {
      return false;
    }

    // Wait one frame so container measurements are stable.
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (this.isDestroyed || token !== this.loadToken) {
      return false;
    }

    const basePage = await document.getPage(1);
    if (this.isDestroyed || token !== this.loadToken) {
      return false;
    }

    const baseViewport = basePage.getViewport({ scale: 1 });
    if (!Number.isFinite(baseViewport.width) || baseViewport.width <= 0) {
      return false;
    }

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) {
      return false;
    }
    this.lastMeasuredContainerWidth = containerWidth;
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 640;

    const pagesStyle = window.getComputedStyle(pagesContainer);
    const horizontalPadding =
      (Number.parseFloat(pagesStyle.paddingLeft) || 0) +
      (Number.parseFloat(pagesStyle.paddingRight) || 0);
    const mobileFitBoost = isMobileViewport ? 1.03 : 1;
    const targetWidth = Math.max(0, (containerWidth - horizontalPadding) * mobileFitBoost);
    if (targetWidth <= 0) {
      return false;
    }

    const fitZoomRaw = targetWidth / baseViewport.width;
    const fitZoom = Math.min(this.MAX_ZOOM, Math.max(this.MIN_ZOOM, fitZoomRaw));
    const roundedZoom = Number(fitZoom.toFixed(2));
    if (!Number.isFinite(roundedZoom) || roundedZoom <= 0) {
      return false;
    }

    const previousZoom = this.zoom();
    this.zoom.set(roundedZoom);
    this.zoomPercent.set(Math.round(roundedZoom * 100));
    return Math.abs(previousZoom - roundedZoom) >= 0.01;
  }

  private async renderAllPages(): Promise<void> {
    if (!this.pdfDocument || this.isDestroyed) {
      return;
    }

    const expectedPages = this.totalPages();
    if (expectedPages <= 0) {
      return;
    }

    const token = ++this.renderToken;
    this.isRendering.set(true);
    this.errorMessage.set('');

    await this.cancelRenderTasks();

    const canvasReady = await this.waitForCanvasList(expectedPages, token);
    if (!canvasReady || !this.pdfDocument || token !== this.renderToken || this.isDestroyed) {
      if (token === this.renderToken) {
        this.isRendering.set(false);
      }
      return;
    }

    try {
      for (let pageNumber = 1; pageNumber <= expectedPages; pageNumber += 1) {
        if (token !== this.renderToken || this.isDestroyed || !this.pdfDocument) {
          return;
        }
        const canvas = this.findCanvasByPageNumber(pageNumber);
        if (!canvas) {
          continue;
        }
        await this.renderSinglePage(this.pdfDocument, canvas, pageNumber, token);
      }
    } catch (error) {
      if (!this.isRenderCancelled(error)) {
        this.errorMessage.set(this.resolveLoadErrorMessage(error));
      }
    } finally {
      if (token === this.renderToken) {
        this.isRendering.set(false);
        this.updateCurrentPageFromScroll();
      }
    }
  }

  private async disposeDocument(): Promise<void> {
    try {
      await this.cancelRenderTasks();
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
    this.lastMeasuredContainerWidth = 0;
  }

  private async renderSinglePage(
    document: PDFDocumentProxy,
    canvas: HTMLCanvasElement,
    pageNumber: number,
    token: number
  ): Promise<void> {
    const page: PDFPageProxy = await document.getPage(pageNumber);
    if (token !== this.renderToken || this.isDestroyed) {
      return;
    }

    const displayScale = this.zoom();
    // Render at a slightly higher internal resolution to keep text crisp
    // when fitting page width into a relatively narrow viewer column.
    const qualityBoost = displayScale < 1 ? 1.35 : 1.15;
    const renderScale = displayScale * qualityBoost;
    const displayViewport = page.getViewport({ scale: displayScale });
    const renderViewport = page.getViewport({ scale: renderScale });

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Không thể tạo canvas context');
    }

    canvas.width = Math.ceil(renderViewport.width * this.pixelRatio);
    canvas.height = Math.ceil(renderViewport.height * this.pixelRatio);
    canvas.style.width = `${displayViewport.width}px`;
    canvas.style.height = `${displayViewport.height}px`;

    const scaleX = canvas.width / renderViewport.width;
    const scaleY = canvas.height / renderViewport.height;
    context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport: renderViewport
    });
    this.renderTasks.set(pageNumber, renderTask);

    try {
      await renderTask.promise;
    } finally {
      if (this.renderTasks.get(pageNumber) === renderTask) {
        this.renderTasks.delete(pageNumber);
      }
    }
  }

  private async cancelRenderTasks(): Promise<void> {
    if (this.renderTasks.size === 0) {
      return;
    }

    const tasks = [...this.renderTasks.values()];
    this.renderTasks.clear();
    for (const task of tasks) {
      task.cancel();
    }

    for (const task of tasks) {
      try {
        await task.promise;
      } catch {
        // ignore cancellation errors
      }
    }
  }

  private async waitForCanvasList(expectedPages: number, token: number): Promise<boolean> {
    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (token !== this.renderToken || this.isDestroyed) {
        return false;
      }
      if (this.pageCanvasRefs().length === expectedPages) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return this.pageCanvasRefs().length === expectedPages;
  }

  private findCanvasByPageNumber(pageNumber: number): HTMLCanvasElement | null {
    const match = this.pageCanvasRefs().find((ref) => {
      const value = Number(ref.nativeElement.dataset['page'] ?? NaN);
      return value === pageNumber;
    });
    return match?.nativeElement ?? null;
  }

  private updateCurrentPageFromScroll(): void {
    const container = this.scrollContainerRef()?.nativeElement;
    const canvasRefs = this.pageCanvasRefs();
    if (!container || canvasRefs.length === 0) {
      return;
    }

    const viewportCenter = container.getBoundingClientRect().top + container.clientHeight / 2;
    let nearestPage = this.page();
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const canvasRef of canvasRefs) {
      const canvas = canvasRef.nativeElement;
      const pageNumber = Number(canvas.dataset['page'] ?? NaN);
      if (!Number.isFinite(pageNumber)) {
        continue;
      }

      const rect = canvas.getBoundingClientRect();
      const canvasCenter = rect.top + rect.height / 2;
      const distance = Math.abs(canvasCenter - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPage = pageNumber;
      }
    }

    if (nearestPage !== this.page()) {
      this.page.set(nearestPage);
    }
  }

  private configureWorker(): void {
    if (typeof window === 'undefined' || GlobalWorkerOptions.workerSrc) {
      return;
    }
    GlobalWorkerOptions.workerSrc = new URL('assets/pdfjs/pdf.worker.min.mjs', document.baseURI).toString();
  }

  private createLoadingTask(source: string): PDFDocumentLoadingTask {
    return getDocument({
      url: source,
      withCredentials: true,
      disableRange: false,
      disableStream: false,
      disableAutoFetch: false,
      rangeChunkSize: this.PDF_RANGE_CHUNK_SIZE
    });
  }

  private isWorkerBootstrapError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return (
      message.includes('setting up fake worker failed') ||
      message.includes('failed to fetch dynamically imported module')
    );
  }

  private async ensureMainThreadWorkerFallback(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const globalScope = globalThis as typeof globalThis & {
      pdfjsWorker?: {
        WorkerMessageHandler?: unknown;
      };
    };

    if (globalScope.pdfjsWorker?.WorkerMessageHandler) {
      return;
    }

    if (!this.workerFallbackPromise) {
      this.workerFallbackPromise = import('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
        .then((workerModule: { WorkerMessageHandler?: unknown }) => {
          if (!workerModule.WorkerMessageHandler) {
            throw new Error('PDF worker module is missing WorkerMessageHandler.');
          }
          globalScope.pdfjsWorker = {
            ...(globalScope.pdfjsWorker ?? {}),
            WorkerMessageHandler: workerModule.WorkerMessageHandler
          };
        })
        .finally(() => {
          this.workerFallbackPromise = null;
        });
    }

    await this.workerFallbackPromise;
  }

  private waitForLoadingTask(task: PDFDocumentLoadingTask): Promise<PDFDocumentProxy> {
    return new Promise<PDFDocumentProxy>((resolve, reject) => {
      let settled = false;
      const startedAt = Date.now();
      let lastProgressAt = startedAt;

      task.onProgress = () => {
        lastProgressAt = Date.now();
      };

      const watchdogId = setInterval(() => {
        if (settled) {
          return;
        }
        const now = Date.now();
        if (now - startedAt >= this.PDF_LOAD_MAX_TOTAL_MS || now - lastProgressAt >= this.PDF_LOAD_STALL_TIMEOUT_MS) {
          settled = true;
          clearInterval(watchdogId);
          void task.destroy().catch(() => undefined);
          reject(new Error('Tải PDF quá lâu trên kết nối hiện tại. Bạn có thể mở tài liệu ở tab mới.'));
        }
      }, 1000);

      task.promise.then(
        (document) => {
          if (settled) {
            return;
          }
          settled = true;
          clearInterval(watchdogId);
          resolve(document);
        },
        (error) => {
          if (settled) {
            return;
          }
          settled = true;
          clearInterval(watchdogId);
          reject(error);
        }
      );
    });
  }

  private scheduleSlowLoadingHint(): void {
    this.clearSlowLoadingHintTimer();
    this.slowLoadingHintTimer = setTimeout(() => {
      this.slowLoadingHint.set('Đang tải...');
      this.slowLoadingHintTimer = null;
    }, this.SLOW_HINT_DELAY_MS);
  }

  private clearSlowLoadingHintTimer(): void {
    if (this.slowLoadingHintTimer) {
      clearTimeout(this.slowLoadingHintTimer);
      this.slowLoadingHintTimer = null;
    }
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
