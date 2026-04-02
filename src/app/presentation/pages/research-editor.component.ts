import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize, of, switchMap, take } from 'rxjs';
import { QuillEditorComponent } from 'ngx-quill';
import { QuillModules } from 'ngx-quill/config';

import { Role } from '../../core/enums/role.enum';
import { ROUTES } from '../../core/constants/route.const';
import { authSignal } from '../../core/signals/auth.signal';
import { ResearchEditorPayload, ResearchPaperService, ResearchStudentAuthorCandidate } from '../../core/services/research-paper.service';
import { ResearchCategoryService } from '../../core/services/research-category.service';
import { ResearchCategory } from '../../core/models/research-category.model';
import { normalizeRichTextHtml } from '../../core/utils/rich-text.util';
import { resolvePublicAssetUrl } from '../../core/utils/public-asset-url.util';

@Component({
  selector: 'app-research-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, QuillEditorComponent],
  template: `
    <div class="bg-white min-h-screen">
      <div class="border-b border-gray-100 bg-blue-50/50 py-2.5 px-2 sm:py-3 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <a [routerLink]="ROUTES.RESEARCH_MY_PAPERS" class="text-hus-blue hover:text-hus-dark transition">
            Bài viết của tôi
          </a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">{{ isEditMode ? 'Chỉnh sửa' : 'Soạn thảo' }}</span>
        </div>
      </div>

      <div class="mx-auto w-full px-1 sm:max-w-7xl sm:px-6 lg:px-8 py-5 sm:py-8 md:py-10">
        <div class="w-full border-0 sm:border-2 sm:border-hus-blue/10 bg-white p-2.5 sm:p-6 md:p-8 lg:p-10">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 leading-tight uppercase tracking-tighter">
            {{ isEditMode ? 'Chỉnh sửa bài viết nghiên cứu' : 'Soạn thảo bài viết nghiên cứu' }}
          </h1>
          <p class="mt-3 text-[11px] sm:text-sm text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            Điền đầy đủ thông tin bài viết, đối tượng tác giả, năm công bố, thể loại và file PDF nếu cần.
          </p>

          <ng-container *ngIf="!isLoadingPaper; else loadingPaperTpl">
            <form class="mt-6 sm:mt-8 space-y-5 sm:space-y-6" (ngSubmit)="save()">
              <div>
                <label for="title" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Tên đề tài
                </label>
                <textarea id="title"
                          name="title"
                          [(ngModel)]="title"
                          maxlength="255"
                          rows="2"
                          required
                          data-title-field="true"
                          (input)="onTitleInput($event)"
                          class="w-full min-h-[76px] border border-gray-200 px-3.5 py-2.5 text-sm leading-6 text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors resize-none overflow-hidden"
                          placeholder="Nhập tên đề tài nghiên cứu"></textarea>
              </div>

              <div class="grid gap-5 sm:grid-cols-2">
                <div>
                  <label for="paperType" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Loại bài nghiên cứu
                  </label>
                  <select id="paperType"
                          name="paperType"
                          [(ngModel)]="selectedPaperType"
                          required
                          class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors">
                    <option value="SCIENTIFIC_RESEARCH">Nghiên cứu khoa học</option>
                    <option value="GRADUATION_THESIS">Khóa luận tốt nghiệp</option>
                  </select>
                </div>

                <div>
                  <label for="category" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Đối tượng tác giả
                  </label>
                  <select id="category"
                          name="category"
                          [(ngModel)]="selectedCategory"
                          [disabled]="!isAdminEditor"
                          required
                          class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="STUDENT">Sinh viên</option>
                    <option value="LECTURER">Giảng viên</option>
                  </select>
                  <p *ngIf="!isAdminEditor" class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Trường này được khóa theo vai trò tài khoản hiện tại.
                  </p>
                </div>

                <div *ngIf="isAdminEditor">
                  <label for="authorName" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Tên tác giả hiển thị
                  </label>
                  <input id="authorName"
                         name="authorName"
                         [(ngModel)]="authorName"
                         maxlength="255"
                         class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors"
                         placeholder="Nhập tên tác giả hiển thị cho bài viết này">
                </div>

                <div>
                  <label for="publicationYear" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Năm công bố
                  </label>
                  <select id="publicationYear"
                          name="publicationYear"
                          [(ngModel)]="publicationYear"
                          required
                          class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors">
                    <option *ngFor="let year of publicationYears" [ngValue]="year">
                      {{ year }}
                    </option>
                  </select>
                </div>

                <div>
                  <label for="journalConference" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Tạp chí / hội nghị
                  </label>
                  <input id="journalConference"
                         name="journalConference"
                         [(ngModel)]="journalConference"
                         maxlength="255"
                         class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors"
                         placeholder="Ví dụ: MIM Draft, Hội nghị khoa học, Tạp chí chuyên ngành">
                </div>
              </div>

              <div class="border border-gray-200 bg-gray-50/40 rounded-sm p-4 sm:p-5">
                <div class="flex flex-col gap-1">
                  <label for="coAuthorSearch" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Đồng tác giả sinh viên
                  </label>
                  <p class="text-[11px] sm:text-xs text-gray-500 leading-5">
                    Tìm theo mã sinh viên để thêm đồng tác giả vào bài nghiên cứu. Tác giả chính vẫn là người tạo bài hiện tại.
                  </p>
                </div>

                <div class="mt-4">
                  <input id="coAuthorSearch"
                         name="coAuthorSearch"
                         [ngModel]="coAuthorSearchKeyword"
                         (ngModelChange)="onCoAuthorSearchKeywordChange($event)"
                         class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 rounded-sm sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors"
                         placeholder="Nhập mã sinh viên, ví dụ: 20210001">
                  <p class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Nhập ít nhất 2 ký tự để tìm nhanh theo mã sinh viên.
                  </p>
                </div>

                <div *ngIf="isSearchingCoAuthors || coAuthorSearchResults.length > 0 || coAuthorSearchMessage"
                     class="mt-4 border border-gray-200 bg-white rounded-sm overflow-hidden">
                  <div *ngIf="isSearchingCoAuthors"
                       class="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Đang tìm sinh viên...
                  </div>

                  <div *ngIf="!isSearchingCoAuthors && coAuthorSearchResults.length > 0" class="divide-y divide-gray-100">
                    <div *ngFor="let candidate of coAuthorSearchResults"
                         class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p class="text-sm font-black text-gray-900">{{ candidate.fullName }}</p>
                        <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Mã sinh viên: {{ candidate.studentId }}
                        </p>
                      </div>

                      <button type="button"
                              (click)="addCoAuthor(candidate)"
                              class="inline-flex h-9 items-center justify-center px-3 rounded-sm border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-wide hover:bg-hus-blue hover:text-white transition-colors">
                        Thêm đồng tác giả
                      </button>
                    </div>
                  </div>

                  <div *ngIf="!isSearchingCoAuthors && coAuthorSearchMessage"
                       class="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {{ coAuthorSearchMessage }}
                  </div>
                </div>

                <div class="mt-4">
                  <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Danh sách đồng tác giả đã chọn
                  </p>

                  <div *ngIf="selectedCoAuthors.length > 0" class="space-y-2">
                    <div *ngFor="let author of selectedCoAuthors"
                         class="flex flex-col gap-3 rounded-sm border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p class="text-sm font-black text-gray-900">{{ author.fullName }}</p>
                        <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {{ author.studentId ? ('Mã sinh viên: ' + author.studentId) : 'Đồng tác giả sinh viên đã liên kết' }}
                        </p>
                      </div>

                      <button type="button"
                              (click)="removeCoAuthor(author.userId)"
                              class="inline-flex h-9 items-center justify-center px-3 rounded-sm border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-wide hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                        Bỏ khỏi bài viết
                      </button>
                    </div>
                  </div>

                  <p *ngIf="selectedCoAuthors.length === 0"
                     class="rounded-sm border border-dashed border-gray-200 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Chưa có đồng tác giả sinh viên nào được thêm.
                  </p>
                </div>
              </div>

              <div>
                <label for="researchArea" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Phân loại bài viết
                </label>
                <select id="researchArea"
                        name="researchArea"
                        [(ngModel)]="selectedResearchArea"
                        required
                        class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors">
                  <option value="" disabled>
                    {{ isLoadingCategories ? 'Đang tải danh mục...' : 'Chọn phân loại' }}
                  </option>
                  <option *ngFor="let category of researchCategories" [value]="category.name">
                    {{ category.name }}
                  </option>
                  <option *ngIf="selectedResearchArea && !isKnownResearchArea(selectedResearchArea)"
                          [value]="selectedResearchArea">
                    {{ selectedResearchArea }} (không còn hoạt động)
                  </option>
                </select>
                <p *ngIf="!isLoadingCategories && researchCategories.length === 0"
                   class="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Chưa có phân loại bài nghiên cứu. Liên hệ admin để thêm danh mục trước khi đăng bài.
                </p>
              </div>

              <div class="w-full sm:max-w-4xl">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Tóm tắt
                </label>
                <div class="w-full border border-gray-200 bg-white overflow-hidden">
                  <ng-container *ngIf="isEditorReady; else editorLoadingTpl">
                    <quill-editor
                      class="research-quill"
                      name="abstract"
                      format="html"
                      theme="snow"
                      [modules]="quillModules"
                      [(ngModel)]="abstract"
                      (ngModelChange)="onAbstractChange()"
                      placeholder="Nhập nội dung tóm tắt công trình nghiên cứu...">
                    </quill-editor>
                  </ng-container>
                  <ng-template #editorLoadingTpl>
                    <div class="min-h-[220px] px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-300">
                      Đang tải nội dung tóm tắt...
                    </div>
                  </ng-template>
                </div>
                <p *ngIf="isAbstractBlank()" class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Dùng toolbar để định dạng nội dung dài: tiêu đề, căn lề, danh sách, trích dẫn, liên kết...
                </p>
              </div>

              <div>
                <label for="pdfFile" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Tệp PDF hiển thị (không bắt buộc)
                </label>
                <input id="pdfFile"
                       type="file"
                       accept="application/pdf,.pdf"
                       (change)="onPdfSelected($event)"
                       class="w-full border border-gray-200 px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-hus-blue transition-colors file:mr-2 sm:file:mr-3 file:border-0 file:bg-hus-blue file:px-2.5 sm:file:px-3 file:py-2 file:text-[9px] sm:file:text-[10px] file:font-black file:text-white file:uppercase file:tracking-widest hover:file:bg-hus-dark">

                <div class="mt-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 space-y-2">
                  <p>
                    {{ selectedPdfName ? 'Tệp đã chọn: ' + selectedPdfName : (existingPdfUrl ? 'Tệp hiện tại: ' + existingPdfFileName : 'Chưa có file PDF') }}
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

              <p *ngIf="successMessage" class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                {{ successMessage }}
              </p>

              <div class="pt-3 border-t border-gray-100">
                <div class="flex items-center justify-end gap-2 lg:gap-3">
                    <button type="button"
                          (click)="cancel()"
                          class="inline-flex h-8 sm:h-9 lg:h-10 shrink-0 items-center justify-center px-2.5 sm:px-3 border border-gray-200 text-gray-500 text-[8px] sm:text-[9px] font-black uppercase tracking-wide hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                    Hủy
                  </button>

                  <button type="submit"
                          [disabled]="isSaving"
                          class="inline-flex h-8 sm:h-9 lg:h-10 items-center justify-center px-2.5 sm:px-3 lg:px-4 bg-hus-blue text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wide hover:bg-hus-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    <span class="sm:hidden">{{ isSaving ? 'Lưu...' : (isEditMode ? 'Cập nhật' : 'Lưu') }}</span>
                    <span class="hidden sm:inline">{{ isSaving ? 'Đang lưu...' : (isEditMode ? 'Cập nhật bài viết' : 'Lưu bài viết') }}</span>
                  </button>
                </div>
              </div>
            </form>
          </ng-container>

          <ng-template #loadingPaperTpl>
            <div class="mt-6 sm:mt-8 border border-dashed border-gray-200 px-4 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Đang tải dữ liệu bài viết...
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `
})
export class ResearchEditorComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paperService = inject(ResearchPaperService);
  private readonly researchCategoryService = inject(ResearchCategoryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly coAuthorSearchInput$ = new Subject<string>();
  private coAuthorSearchSub: Subscription | null = null;

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

  readonly publicationYears = this.buildPublicationYears();

  isEditMode = false;
  editingPaperId: string | null = null;

  researchCategories: ResearchCategory[] = [];
  isLoadingCategories = false;
  selectedResearchArea = '';
  selectedPaperType: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS' = 'SCIENTIFIC_RESEARCH';
  selectedCategory: 'LECTURER' | 'STUDENT' = 'STUDENT';
  authorName = '';
  coAuthorSearchKeyword = '';
  coAuthorSearchResults: ResearchStudentAuthorCandidate[] = [];
  selectedCoAuthors: ResearchStudentAuthorCandidate[] = [];
  coAuthorSearchMessage = '';
  isSearchingCoAuthors = false;
  publicationYear = new Date().getFullYear();
  journalConference = 'MIM Draft';

  title = '';
  abstract = '';
  selectedPdfFile: File | null = null;
  selectedPdfPreviewUrl: string | null = null;
  selectedPdfName = '';
  existingPdfUrl: string | null = null;
  errorMessage = '';
  successMessage = '';
  isSaving = false;
  isLoadingPaper = false;
  isEditorReady = false;

  get isAdminEditor(): boolean {
    return authSignal.user()?.role === Role.ADMIN;
  }

  get effectivePdfUrl(): string | null {
    return this.selectedPdfPreviewUrl ?? this.existingPdfUrl;
  }

  get existingPdfFileName(): string {
    if (!this.existingPdfUrl) {
      return '';
    }

    try {
      const withoutHash = this.existingPdfUrl.split('#')[0];
      const withoutQuery = withoutHash.split('?')[0];
      const segments = withoutQuery.split('/');
      const rawName = segments[segments.length - 1] || '';
      const decoded = decodeURIComponent(rawName);
      return decoded || 'Tệp PDF';
    } catch {
      return 'Tệp PDF';
    }
  }

  ngOnInit(): void {
    const currentUser = authSignal.user();
    if (!currentUser) {
      this.redirectToMyPapers('Vui lòng đăng nhập để thao tác bài viết.');
      return;
    }

    if (!authSignal.canCreateContent()) {
      this.redirectToMyPapers('Tài khoản chưa xác thực email. Bạn chưa thể tạo hoặc cập nhật bài viết.');
      return;
    }

    this.initializeAuthorCategory(currentUser.role);
    this.loadResearchCategories();
    this.bindCoAuthorSearch();

    const paperId = this.route.snapshot.paramMap.get('id');
    if (!paperId) {
      this.isEditorReady = true;
      this.scheduleTitleTextareaResize();
      return;
    }

    this.isEditMode = true;
    this.editingPaperId = paperId;
    this.isLoadingPaper = true;
    this.isEditorReady = false;

    this.paperService.getMyPaperById(paperId, currentUser).pipe(
      take(1),
      finalize(() => {
        this.isLoadingPaper = false;
        this.isEditorReady = true;
        this.cdr.detectChanges();
      })
    ).subscribe((paper) => {
      if (!paper) {
        this.redirectToMyPapers('Bài viết không tồn tại hoặc bạn không có quyền chỉnh sửa.');
        return;
      }

      this.title = paper.title;
      this.abstract = this.normalizeToEditorHtml(normalizeRichTextHtml(paper.abstract));
      this.existingPdfUrl = paper.pdfUrl?.trim() ? (resolvePublicAssetUrl(paper.pdfUrl.trim()) || paper.pdfUrl.trim()) : null;
      this.selectedResearchArea = paper.researchArea ?? '';
      this.selectedPaperType = paper.paperType ?? 'SCIENTIFIC_RESEARCH';
      this.selectedCategory = paper.category === Role.LECTURER ? 'LECTURER' : 'STUDENT';
      this.authorName = paper.authors.find((author) => author.isMainAuthor)?.name ?? '';
      this.selectedCoAuthors = paper.authors
        .filter((author) => !author.isMainAuthor && author.authorType === 'STUDENT' && author.studentId)
        .map((author) => ({
          userId: author.studentId,
          studentId: '',
          fullName: author.name
        }));
      this.publicationYear = paper.publicationYear || new Date().getFullYear();
      this.journalConference = (paper.journalConference ?? 'MIM Draft').trim() || 'MIM Draft';
      this.scheduleTitleTextareaResize();
      this.cdr.detectChanges();
    });
  }

  save(): void {
    const currentUser = authSignal.user();
    if (!currentUser) {
      this.redirectToMyPapers('Vui lòng đăng nhập để thao tác bài viết.');
      return;
    }

    if (!authSignal.canCreateContent()) {
      this.errorMessage = 'Tài khoản chưa xác thực email. Bạn chưa thể tạo hoặc cập nhật bài viết.';
      return;
    }

    this.successMessage = '';
    const trimmedTitle = this.title.trim();
    const abstractHtml = normalizeRichTextHtml((this.abstract ?? '').trim());
    const abstractPlainText = this.toPlainText(abstractHtml);
    const trimmedResearchArea = this.selectedResearchArea.trim();

    if (!trimmedTitle || !trimmedResearchArea || !abstractPlainText) {
      this.errorMessage = 'Vui lòng nhập đầy đủ tên đề tài, lĩnh vực và tóm tắt.';
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
            researchArea: trimmedResearchArea,
            paperType: this.selectedPaperType,
            publicationYear: this.publicationYear,
            journalConference: this.journalConference.trim(),
            category: this.selectedCategory,
            authorName: this.isAdminEditor ? this.authorName.trim() : undefined,
            coAuthorStudentIds: this.selectedCoAuthors.map((author) => author.userId),
            pdfUrl: uploadedPdfUrl ?? this.existingPdfUrl ?? undefined
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
            ? (savedPaper.approvalStatus === 'PENDING'
              ? 'Đã cập nhật bài viết nghiên cứu và gửi lại duyệt.'
              : 'Đã cập nhật bài viết nghiên cứu.')
            : 'Đã tạo bài viết nghiên cứu mới.';

          if (this.isEditMode) {
            this.successMessage = notice;
            return;
          }

          this.resetEditorForm(currentUser.role);
          this.successMessage = 'Đăng bài thành công. Bạn có thể tiếp tục tạo bài viết mới.';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage = error?.error?.message || 'Lưu bài viết thất bại. Vui lòng thử lại.';
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

  onTitleInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.autoResizeTextarea(textarea);
  }

  onCoAuthorSearchKeywordChange(value: string): void {
    this.coAuthorSearchKeyword = value ?? '';
    this.coAuthorSearchInput$.next(this.coAuthorSearchKeyword);
  }

  isAbstractBlank(): boolean {
    return !this.toPlainText(this.abstract);
  }

  isKnownResearchArea(name: string): boolean {
    return this.researchCategories.some((category) => category.name === name);
  }

  addCoAuthor(candidate: ResearchStudentAuthorCandidate): void {
    const currentUserId = authSignal.user()?.id ?? '';
    if (!candidate?.userId || candidate.userId === currentUserId || this.hasSelectedCoAuthor(candidate.userId)) {
      return;
    }

    this.selectedCoAuthors = [...this.selectedCoAuthors, candidate];
    this.coAuthorSearchKeyword = '';
    this.coAuthorSearchResults = [];
    this.coAuthorSearchMessage = '';
  }

  removeCoAuthor(userId: string): void {
    this.selectedCoAuthors = this.selectedCoAuthors.filter((author) => author.userId !== userId);
    if (this.coAuthorSearchKeyword.trim().length >= 2) {
      this.coAuthorSearchInput$.next(this.coAuthorSearchKeyword);
    }
  }

  ngOnDestroy(): void {
    this.coAuthorSearchSub?.unsubscribe();
    this.revokeSelectedPreviewUrl();
  }

  private redirectToMyPapers(notice: string): void {
    this.router.navigateByUrl(ROUTES.RESEARCH_MY_PAPERS, { state: { notice } });
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

  private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  private scheduleTitleTextareaResize(): void {
    setTimeout(() => {
      const titleTextarea = document.querySelector<HTMLTextAreaElement>('textarea[data-title-field="true"]');
      if (!titleTextarea) {
        return;
      }
      this.autoResizeTextarea(titleTextarea);
    });
  }

  private bindCoAuthorSearch(): void {
    this.coAuthorSearchSub = this.coAuthorSearchInput$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((rawKeyword) => {
        const keyword = (rawKeyword ?? '').trim();
        if (keyword.length < 2) {
          this.isSearchingCoAuthors = false;
          this.coAuthorSearchResults = [];
          this.coAuthorSearchMessage = keyword ? 'Nhập ít nhất 2 ký tự để tìm mã sinh viên.' : '';
          this.cdr.detectChanges();
          return of<ResearchStudentAuthorCandidate[]>([]);
        }

        this.isSearchingCoAuthors = true;
        this.coAuthorSearchMessage = '';
        return this.paperService.searchStudentAuthorsByStudentId(keyword).pipe(
          finalize(() => {
            this.isSearchingCoAuthors = false;
            this.cdr.detectChanges();
          })
        );
      })
    ).subscribe((items) => {
      const keyword = this.coAuthorSearchKeyword.trim();
      if (keyword.length < 2) {
        return;
      }

      const currentUserId = authSignal.user()?.id ?? '';
      const availableItems = items.filter((item) => item.userId !== currentUserId && !this.hasSelectedCoAuthor(item.userId));
      this.coAuthorSearchResults = availableItems;

      if (availableItems.length > 0) {
        this.coAuthorSearchMessage = '';
      } else {
        this.coAuthorSearchMessage = items.length > 0
          ? 'Các sinh viên phù hợp đã được thêm vào bài viết.'
          : 'Không tìm thấy sinh viên phù hợp.';
      }
      this.cdr.detectChanges();
    });
  }

  private loadResearchCategories(): void {
    this.isLoadingCategories = true;
    this.researchCategoryService.getActiveCategories()
      .pipe(
        take(1),
        finalize(() => (this.isLoadingCategories = false))
      )
      .subscribe((categories) => {
        this.researchCategories = categories;
        if (!this.selectedResearchArea && categories.length > 0) {
          this.selectedResearchArea = categories[0].name;
        }
      });
  }

  private initializeAuthorCategory(role: Role): void {
    if (role === Role.LECTURER) {
      this.selectedCategory = 'LECTURER';
      return;
    }

    this.selectedCategory = 'STUDENT';
  }

  private hasSelectedCoAuthor(userId: string): boolean {
    return this.selectedCoAuthors.some((author) => author.userId === userId);
  }

  private buildPublicationYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear + 1; year >= 2000; year -= 1) {
      years.push(year);
    }
    return years;
  }

  private resetEditorForm(role: Role): void {
    this.title = '';
    this.abstract = '';
    this.selectedPaperType = 'SCIENTIFIC_RESEARCH';
    this.publicationYear = new Date().getFullYear();
    this.journalConference = 'MIM Draft';
    this.authorName = '';
    this.coAuthorSearchKeyword = '';
    this.coAuthorSearchResults = [];
    this.selectedCoAuthors = [];
    this.coAuthorSearchMessage = '';
    this.isSearchingCoAuthors = false;
    this.selectedResearchArea = this.researchCategories[0]?.name ?? '';
    this.existingPdfUrl = null;
    this.selectedPdfFile = null;
    this.selectedPdfName = '';
    this.revokeSelectedPreviewUrl();
    this.initializeAuthorCategory(role);
    this.scheduleTitleTextareaResize();
    this.cdr.detectChanges();
  }
}
