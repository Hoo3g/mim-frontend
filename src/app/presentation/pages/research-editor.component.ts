import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, of, switchMap, take } from 'rxjs';
import { QuillEditorComponent } from 'ngx-quill';
import { QuillModules } from 'ngx-quill/config';

import { Role } from '../../core/enums/role.enum';
import { ROUTES } from '../../core/constants/route.const';
import { authSignal } from '../../core/signals/auth.signal';
import { ResearchEditorPayload, ResearchPaperService } from '../../core/services/research-paper.service';
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
            Bai viet cua toi
          </a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">{{ isEditMode ? 'Chinh sua' : 'Soan thao' }}</span>
        </div>
      </div>

      <div class="mx-auto w-full px-1 sm:max-w-7xl sm:px-6 lg:px-8 py-5 sm:py-8 md:py-10">
        <div class="w-full border-0 sm:border-2 sm:border-hus-blue/10 bg-white p-2.5 sm:p-6 md:p-8 lg:p-10">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 leading-tight uppercase tracking-tighter">
            {{ isEditMode ? 'Chinh sua bai viet nghien cuu' : 'Soan thao bai viet nghien cuu' }}
          </h1>
          <p class="mt-3 text-[11px] sm:text-sm text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            Dien day du thong tin bai viet, doi tuong tac gia, nam cong bo, the loai va file PDF neu can.
          </p>

          <ng-container *ngIf="!isLoadingPaper; else loadingPaperTpl">
            <form class="mt-6 sm:mt-8 space-y-5 sm:space-y-6" (ngSubmit)="save()">
              <div>
                <label for="title" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Ten de tai
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
                          placeholder="Nhap ten de tai nghien cuu"></textarea>
              </div>

              <div class="grid gap-5 sm:grid-cols-2">
                <div>
                  <label for="paperType" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Loai bai nghien cuu
                  </label>
                  <select id="paperType"
                          name="paperType"
                          [(ngModel)]="selectedPaperType"
                          required
                          class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors">
                    <option value="SCIENTIFIC_RESEARCH">Nghien cuu khoa hoc</option>
                    <option value="GRADUATION_THESIS">Khoa luan tot nghiep</option>
                  </select>
                </div>

                <div>
                  <label for="category" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Doi tuong tac gia
                  </label>
                  <select id="category"
                          name="category"
                          [(ngModel)]="selectedCategory"
                          [disabled]="!isAdminEditor"
                          required
                          class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="STUDENT">Sinh vien</option>
                    <option value="LECTURER">Giang vien</option>
                  </select>
                  <p *ngIf="!isAdminEditor" class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Truong nay duoc khoa theo vai tro tai khoan hien tai.
                  </p>
                </div>

                <div>
                  <label for="publicationYear" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Nam cong bo
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
                    Tap chi / hoi nghi
                  </label>
                  <input id="journalConference"
                         name="journalConference"
                         [(ngModel)]="journalConference"
                         maxlength="255"
                         class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors"
                         placeholder="Vi du: MIM Draft, Hoi nghi khoa hoc, Tap chi chuyen nganh">
                </div>
              </div>

              <div>
                <label for="researchArea" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Phan loai bai viet
                </label>
                <select id="researchArea"
                        name="researchArea"
                        [(ngModel)]="selectedResearchArea"
                        required
                        class="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 sm:px-4 sm:py-3 focus:outline-none focus:border-hus-blue transition-colors">
                  <option value="" disabled>
                    {{ isLoadingCategories ? 'Dang tai danh muc...' : 'Chon phan loai' }}
                  </option>
                  <option *ngFor="let category of researchCategories" [value]="category.name">
                    {{ category.name }}
                  </option>
                  <option *ngIf="selectedResearchArea && !isKnownResearchArea(selectedResearchArea)"
                          [value]="selectedResearchArea">
                    {{ selectedResearchArea }} (khong con hoat dong)
                  </option>
                </select>
                <p *ngIf="!isLoadingCategories && researchCategories.length === 0"
                   class="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Chua co phan loai bai nghien cuu. Lien he admin de them danh muc truoc khi dang bai.
                </p>
              </div>

              <div class="w-full sm:max-w-4xl">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Tom tat
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
                      placeholder="Nhap noi dung tom tat cong trinh nghien cuu...">
                    </quill-editor>
                  </ng-container>
                  <ng-template #editorLoadingTpl>
                    <div class="min-h-[220px] px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-300">
                      Dang tai noi dung tom tat...
                    </div>
                  </ng-template>
                </div>
                <p *ngIf="isAbstractBlank()" class="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Dung toolbar de dinh dang noi dung dai: tieu de, can le, danh sach, trich dan, lien ket...
                </p>
              </div>

              <div>
                <label for="pdfFile" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Tep PDF hien thi (khong bat buoc)
                </label>
                <input id="pdfFile"
                       type="file"
                       accept="application/pdf,.pdf"
                       (change)="onPdfSelected($event)"
                       class="w-full border border-gray-200 px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-hus-blue transition-colors file:mr-2 sm:file:mr-3 file:border-0 file:bg-hus-blue file:px-2.5 sm:file:px-3 file:py-2 file:text-[9px] sm:file:text-[10px] file:font-black file:text-white file:uppercase file:tracking-widest hover:file:bg-hus-dark">

                <div class="mt-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 space-y-2">
                  <p>
                    {{ selectedPdfName ? 'Tep da chon: ' + selectedPdfName : (existingPdfUrl ? 'Tep hien tai: ' + existingPdfFileName : 'Chua co file PDF') }}
                  </p>

                  <a *ngIf="effectivePdfUrl"
                     [href]="effectivePdfUrl"
                     target="_blank"
                     class="inline-block text-hus-blue hover:text-hus-dark transition underline underline-offset-2">
                    Xem PDF dang dung
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
                    Huy
                  </button>

                  <button type="submit"
                          [disabled]="isSaving"
                          class="inline-flex h-8 sm:h-9 lg:h-10 items-center justify-center px-2.5 sm:px-3 lg:px-4 bg-hus-blue text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wide hover:bg-hus-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    <span class="sm:hidden">{{ isSaving ? 'Luu...' : (isEditMode ? 'Cap nhat' : 'Luu') }}</span>
                    <span class="hidden sm:inline">{{ isSaving ? 'Dang luu...' : (isEditMode ? 'Cap nhat bai viet' : 'Luu bai viet') }}</span>
                  </button>
                </div>
              </div>
            </form>
          </ng-container>

          <ng-template #loadingPaperTpl>
            <div class="mt-6 sm:mt-8 border border-dashed border-gray-200 px-4 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Dang tai du lieu bai viet...
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
      return decoded || 'Tep PDF';
    } catch {
      return 'Tep PDF';
    }
  }

  ngOnInit(): void {
    const currentUser = authSignal.user();
    if (!currentUser) {
      this.redirectToMyPapers('Vui long dang nhap de thao tac bai viet.');
      return;
    }

    if (!authSignal.canCreateContent()) {
      this.redirectToMyPapers('Tai khoan chua xac thuc email. Ban chua the tao hoac cap nhat bai viet.');
      return;
    }

    this.initializeAuthorCategory(currentUser.role);
    this.loadResearchCategories();

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
        this.redirectToMyPapers('Bai viet khong ton tai hoac ban khong co quyen chinh sua.');
        return;
      }

      this.title = paper.title;
      this.abstract = this.normalizeToEditorHtml(normalizeRichTextHtml(paper.abstract));
      this.existingPdfUrl = paper.pdfUrl?.trim() ? (resolvePublicAssetUrl(paper.pdfUrl.trim()) || paper.pdfUrl.trim()) : null;
      this.selectedResearchArea = paper.researchArea ?? '';
      this.selectedPaperType = paper.paperType ?? 'SCIENTIFIC_RESEARCH';
      this.selectedCategory = paper.category === Role.LECTURER ? 'LECTURER' : 'STUDENT';
      this.publicationYear = paper.publicationYear || new Date().getFullYear();
      this.journalConference = (paper.journalConference ?? 'MIM Draft').trim() || 'MIM Draft';
      this.scheduleTitleTextareaResize();
      this.cdr.detectChanges();
    });
  }

  save(): void {
    const currentUser = authSignal.user();
    if (!currentUser) {
      this.redirectToMyPapers('Vui long dang nhap de thao tac bai viet.');
      return;
    }

    if (!authSignal.canCreateContent()) {
      this.errorMessage = 'Tai khoan chua xac thuc email. Ban chua the tao hoac cap nhat bai viet.';
      return;
    }

    this.successMessage = '';
    const trimmedTitle = this.title.trim();
    const abstractHtml = normalizeRichTextHtml((this.abstract ?? '').trim());
    const abstractPlainText = this.toPlainText(abstractHtml);
    const trimmedResearchArea = this.selectedResearchArea.trim();

    if (!trimmedTitle || !trimmedResearchArea || !abstractPlainText) {
      this.errorMessage = 'Vui long nhap day du ten de tai, linh vuc va tom tat.';
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
              this.redirectToMyPapers('Khong the cap nhat bai viet.');
              return;
            }
            this.errorMessage = 'Khong the luu bai viet. Vui long thu lai.';
            return;
          }

          const notice = this.isEditMode
            ? (savedPaper.approvalStatus === 'PENDING'
              ? 'Da cap nhat bai viet nghien cuu va gui lai duyet.'
              : 'Da cap nhat bai viet nghien cuu.')
            : 'Da tao bai viet nghien cuu moi.';

          if (this.isEditMode) {
            this.successMessage = notice;
            return;
          }

          this.resetEditorForm(currentUser.role);
          this.successMessage = 'Dang bai thanh cong. Ban co the tiep tuc tao bai viet moi.';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage = error?.error?.message || 'Luu bai viet that bai. Vui long thu lai.';
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
      this.errorMessage = 'Chi chap nhan tep PDF.';
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

  isAbstractBlank(): boolean {
    return !this.toPlainText(this.abstract);
  }

  isKnownResearchArea(name: string): boolean {
    return this.researchCategories.some((category) => category.name === name);
  }

  ngOnDestroy(): void {
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
