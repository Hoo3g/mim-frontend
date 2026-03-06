import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, of, switchMap, take } from 'rxjs';
import { QuillEditorComponent } from 'ngx-quill';
import { QuillModules } from 'ngx-quill/config';

import { ROUTES } from '../../core/constants/route.const';
import { authSignal } from '../../core/signals/auth.signal';
import { ResearchEditorPayload, ResearchPaperService } from '../../core/services/research-paper.service';

@Component({
    selector: 'app-research-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, QuillEditorComponent],
    template: `
    <div class="bg-white min-h-screen">
      <div class="border-b border-gray-100 bg-blue-50/50 py-3 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <a [routerLink]="ROUTES.RESEARCH_MY_PAPERS" class="text-hus-blue hover:text-hus-dark transition">
            Bài viết của tôi
          </a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">{{ isEditMode ? 'Chỉnh sửa' : 'Soạn thảo' }}</span>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="max-w-3xl mx-auto border-2 border-hus-blue/10 bg-white p-8 md:p-10">
          <h1 class="text-3xl md:text-4xl font-black text-gray-900 leading-tight uppercase tracking-tighter">
            {{ isEditMode ? 'Chỉnh sửa bài viết nghiên cứu' : 'Soạn thảo bài viết nghiên cứu' }}
          </h1>
          <p class="mt-4 text-sm text-gray-400 font-bold uppercase tracking-widest">
            Điền thông tin cơ bản cho bài viết: tên đề tài và phần tóm tắt.
          </p>

          <form class="mt-8 space-y-6" (ngSubmit)="save()">
            <div>
              <label for="title" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Tên đề tài
              </label>
              <input id="title"
                     name="title"
                     type="text"
                     [(ngModel)]="title"
                     maxlength="255"
                     required
                     class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                     placeholder="Nhập tên đề tài nghiên cứu">
            </div>

            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Tóm tắt
              </label>
              <div class="border border-gray-200 bg-white overflow-hidden">
                <quill-editor
                  class="research-quill"
                  name="abstract"
                  format="html"
                  theme="snow"
                  [modules]="quillModules"
                  [styles]="{ height: '300px' }"
                  [(ngModel)]="abstract"
                  (ngModelChange)="onAbstractChange()"
                  placeholder="Nhập nội dung tóm tắt công trình nghiên cứu...">
                </quill-editor>
              </div>
              <p *ngIf="isAbstractBlank()" class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Dùng toolbar để định dạng nội dung dài: tiêu đề, căn lề, danh sách, trích dẫn, liên kết...
              </p>
            </div>

            <div>
              <label for="pdfFile" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Tệp PDF hiển thị
              </label>
              <input id="pdfFile"
                     type="file"
                     accept="application/pdf,.pdf"
                     (change)="onPdfSelected($event)"
                     class="w-full border border-gray-200 px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-hus-blue transition-colors file:mr-3 file:border-0 file:bg-hus-blue file:px-3 file:py-2 file:text-[10px] file:font-black file:text-white file:uppercase file:tracking-widest hover:file:bg-hus-dark">

              <div class="mt-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 space-y-2">
                <p *ngIf="selectedPdfName; else currentPdfInfo">
                  Tệp đã chọn: <span class="text-hus-blue">{{ selectedPdfName }}</span>
                </p>
                <ng-template #currentPdfInfo>
                  <p>
                    {{ existingPdfUrl ? 'Đang dùng PDF hiện tại' : 'Chưa có PDF, sẽ dùng mẫu mặc định' }}
                  </p>
                </ng-template>
                <p *ngIf="selectedPdfName" class="text-hus-blue">
                  Tệp sẽ được tải lên MinIO khi bạn bấm lưu.
                </p>
                <a *ngIf="effectivePdfUrl"
                   [href]="effectivePdfUrl"
                   target="_blank"
                   class="inline-block text-hus-blue hover:text-hus-dark transition underline underline-offset-2">
                  Xem PDF đang dùng
                </a>
              </div>
            </div>

            <p *ngIf="errorMessage" class="text-[11px] font-bold text-red-600 uppercase tracking-wider">
              {{ errorMessage }}
            </p>

            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button"
                      (click)="cancel()"
                      class="sm:min-w-36 px-5 py-3 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="submit"
                      [disabled]="isSaving"
                      class="sm:min-w-44 px-5 py-3 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors">
                {{ isSaving ? 'Đang lưu...' : (isEditMode ? 'Cập nhật bài viết' : 'Lưu bài viết') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ResearchEditorComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly paperService = inject(ResearchPaperService);

    protected readonly ROUTES = ROUTES;
    protected readonly quillModules: QuillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ header: [1, 2, 3, false] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['blockquote', 'code-block'],
            ['link', 'image'],
            ['clean']
        ]
    };

    isEditMode = false;
    editingPaperId: string | null = null;

    title = '';
    abstract = '';
    selectedPdfFile: File | null = null;
    selectedPdfPreviewUrl: string | null = null;
    selectedPdfName = '';
    existingPdfUrl: string | null = null;
    errorMessage = '';
    isSaving = false;

    get effectivePdfUrl(): string | null {
        return this.selectedPdfPreviewUrl ?? this.existingPdfUrl;
    }

    ngOnInit(): void {
        const currentUser = authSignal.user();
        if (!currentUser) {
            this.redirectToMyPapers('Vui lòng đăng nhập để thao tác bài viết.');
            return;
        }

        const paperId = this.route.snapshot.paramMap.get('id');
        if (!paperId) {
            return;
        }

        this.isEditMode = true;
        this.editingPaperId = paperId;

        this.paperService.getPaperById(paperId).pipe(take(1)).subscribe((paper) => {
            if (!paper || !this.paperService.isOwnedByUser(paper, currentUser)) {
                this.redirectToMyPapers('Bài viết không tồn tại hoặc bạn không có quyền chỉnh sửa.');
                return;
            }

            this.title = paper.title;
            this.abstract = this.normalizeToEditorHtml(paper.abstract);
            this.existingPdfUrl = paper.pdfUrl;
        });
    }

    save(): void {
        const currentUser = authSignal.user();
        if (!currentUser) {
            this.redirectToMyPapers('Vui lòng đăng nhập để thao tác bài viết.');
            return;
        }

        const trimmedTitle = this.title.trim();
        const abstractHtml = (this.abstract ?? '').trim();
        const abstractPlainText = this.toPlainText(abstractHtml);

        if (!trimmedTitle || !abstractPlainText) {
            this.errorMessage = 'Vui lòng nhập đầy đủ tên đề tài và tóm tắt.';
            return;
        }

        this.errorMessage = '';
        this.isSaving = true;

        const upload$ = this.selectedPdfFile
            ? this.paperService.uploadPdfToMinio(this.selectedPdfFile)
            : of<string | null>(null);

        upload$
            .pipe(
                switchMap((uploadedPdfUrl) => {
                    const payload: ResearchEditorPayload = {
                        id: this.editingPaperId ?? undefined,
                        title: trimmedTitle,
                        abstract: abstractHtml,
                        pdfUrl: uploadedPdfUrl ?? undefined
                    };
                    return this.paperService.saveFromEditor(payload, currentUser);
                }),
                finalize(() => (this.isSaving = false))
            )
            .subscribe({
                next: (savedPaper) => {
                    if (!savedPaper) {
                        if (this.isEditMode) {
                            this.redirectToMyPapers('Không thể cập nhật bài viết.');
                            return;
                        }
                        this.errorMessage = 'Không thể lưu bài viết. Vui lòng thử lại.';
                        return;
                    }

                    const notice = this.isEditMode
                        ? 'Đã cập nhật bài viết nghiên cứu.'
                        : 'Đã tạo bài viết nghiên cứu mới.';
                    this.router.navigateByUrl(ROUTES.RESEARCH_MY_PAPERS, { state: { notice } });
                },
                error: () => {
                    this.errorMessage = 'Lưu bài viết thất bại. Vui lòng thử lại.';
                }
            });
    }

    onPdfSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        const isPdfMime = file.type === 'application/pdf';
        const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
        if (!isPdfMime && !hasPdfExtension) {
            this.errorMessage = 'Chỉ chấp nhận tệp PDF.';
            this.selectedPdfFile = null;
            this.selectedPdfName = '';
            this.revokeSelectedPreviewUrl();
            input.value = '';
            return;
        }

        this.errorMessage = '';
        this.revokeSelectedPreviewUrl();
        this.selectedPdfFile = file;
        this.selectedPdfName = file.name;
        this.selectedPdfPreviewUrl = URL.createObjectURL(file);
    }

    cancel(): void {
        this.router.navigateByUrl(ROUTES.RESEARCH_MY_PAPERS);
    }

    onAbstractChange(): void {
        this.errorMessage = '';
    }

    isAbstractBlank(): boolean {
        return !this.toPlainText(this.abstract);
    }

    private redirectToMyPapers(notice: string): void {
        this.router.navigateByUrl(ROUTES.RESEARCH_MY_PAPERS, { state: { notice } });
    }

    ngOnDestroy(): void {
        this.revokeSelectedPreviewUrl();
    }

    private normalizeToEditorHtml(value: string): string {
        const raw = value?.trim() ?? '';
        if (!raw) {
            return '';
        }

        if (/<[a-z][\s\S]*>/i.test(raw)) {
            return raw;
        }

        return this.escapeHtml(raw).replace(/\n/g, '<br>');
    }

    private toPlainText(html: string): string {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html ?? '';
        return (wrapper.textContent ?? '')
            .replace(/\u00A0/g, ' ')
            .trim();
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private revokeSelectedPreviewUrl(): void {
        if (this.selectedPdfPreviewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(this.selectedPdfPreviewUrl);
        }
        this.selectedPdfPreviewUrl = null;
    }
}
