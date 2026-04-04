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
      <div class="border-b border-gray-100 bg-blue-50/50 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <a [routerLink]="ROUTES.RESEARCH_MY_PAPERS" class="text-hus-blue hover:text-hus-dark transition">
            Bài viết của tôi
          </a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">{{ isEditMode ? 'Chỉnh sửa' : 'Soạn thảo' }}</span>
        </div>
      </div>

      <div class="mx-auto w-full px-3 py-5 sm:max-w-5xl sm:px-6 sm:py-8 md:py-10 lg:px-8">
        <div class="w-full border-0 sm:border-2 sm:border-hus-blue/10 bg-white p-0 sm:p-6 md:p-8 lg:p-10">
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
            <ng-container *ngIf="isEditMode; else createResearchHeading">
              Chỉnh sửa bài <span class="text-hus-blue">nghiên cứu</span>
            </ng-container>
            <ng-template #createResearchHeading>
              Soạn bài <span class="text-hus-blue">nghiên cứu mới</span>
            </ng-template>
          </h1>
          <p class="mt-3 text-[10px] sm:text-sm text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            Điền đầy đủ thông tin bài viết, đối tượng tác giả, năm công bố, thể loại và file PDF nếu cần.
          </p>

          <ng-container *ngIf="!isLoadingPaper; else loadingPaperTpl">
            <form class="mt-6 sm:mt-8 space-y-4 sm:space-y-5" (ngSubmit)="save()">
              <article class="py-3 sm:py-5 space-y-4">
                <h2 class="text-[11px] sm:text-[13px] font-black uppercase tracking-widest text-hus-blue">Thông tin chính</h2>

                <div>
                  <label for="title" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
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
                            class="w-full min-h-[68px] sm:min-h-[76px] border-2 border-gray-300 rounded-md px-3 py-2 text-[13px] leading-5 text-gray-900 sm:px-4 sm:py-3 sm:text-sm sm:leading-6 focus:outline-none focus:border-hus-blue transition-colors resize-none overflow-hidden"
                            placeholder="Nhập tên đề tài nghiên cứu"></textarea>
                </div>

                <div class="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label for="paperType" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                      Loại bài nghiên cứu
                    </label>
                    <select id="paperType"
                            name="paperType"
                            [(ngModel)]="selectedPaperType"
                            required
                            class="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 sm:px-4 sm:py-3 sm:text-sm focus:outline-none focus:border-hus-blue transition-colors">
                      <option value="SCIENTIFIC_RESEARCH">Nghiên cứu khoa học</option>
                      <option value="GRADUATION_THESIS">Khóa luận tốt nghiệp</option>
                    </select>
                  </div>

                  <div>
                    <label for="category" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                      Đối tượng tác giả
                    </label>
                    <select id="category"
                            name="category"
                            [(ngModel)]="selectedCategory"
                            [disabled]="!isAdminEditor"
                            required
                            class="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 sm:px-4 sm:py-3 sm:text-sm focus:outline-none focus:border-hus-blue transition-colors disabled:bg-gray-50 disabled:text-gray-400">
                      <option value="STUDENT">Sinh viên</option>
                      <option value="LECTURER">Giảng viên</option>
                    </select>
              
                  </div>

                  <div>
                    <label for="publicationYear" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                      Năm công bố
                    </label>
                    <select id="publicationYear"
                            name="publicationYear"
                            [(ngModel)]="publicationYear"
                            required
                            class="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 sm:px-4 sm:py-3 sm:text-sm focus:outline-none focus:border-hus-blue transition-colors">
                      <option *ngFor="let year of publicationYears" [ngValue]="year">
                        {{ year }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label for="researchArea" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                      Phân loại bài viết
                    </label>
                    <select id="researchArea"
                            name="researchArea"
                            [(ngModel)]="selectedResearchArea"
                            required
                            class="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 sm:px-4 sm:py-3 sm:text-sm focus:outline-none focus:border-hus-blue transition-colors">
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
                       class="mt-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-amber-600">
                      Chưa có phân loại bài nghiên cứu. Liên hệ admin để thêm danh mục trước khi đăng bài.
                    </p>
                  </div>
                </div>

                <div *ngIf="isAdminEditor">
                  <label for="authorName" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                    Tên tác giả hiển thị
                  </label>
                  <input id="authorName"
                         name="authorName"
                         [(ngModel)]="authorName"
                         maxlength="255"
                         class="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 sm:px-4 sm:py-3 sm:text-sm focus:outline-none focus:border-hus-blue transition-colors"
                         placeholder="Nhập tên tác giả hiển thị cho bài viết này">
                </div>
              </article>

              <article class="py-3 sm:py-5 space-y-4">
                <h2 class="text-[11px] sm:text-[13px] font-black uppercase tracking-widest text-hus-blue">Đồng tác giả sinh viên</h2>

                <div>
                  <label for="coAuthorSearch" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                    Mã sinh viên đồng tác giả
                  </label>
                  <div class="flex items-stretch gap-2">
                    <input id="coAuthorSearch"
                           name="coAuthorSearch"
                           [ngModel]="coAuthorSearchKeyword"
                           (ngModelChange)="onCoAuthorSearchKeywordChange($event)"
                           (keyup.enter)="triggerCoAuthorSearch()"
                           class="w-full border-2 border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 sm:px-4 sm:py-3 sm:text-sm focus:outline-none focus:border-hus-blue transition-colors"
                           placeholder="Nhập mã sinh viên đồng tác giả">
                    <button type="button"
                            (click)="triggerCoAuthorSearch()"
                            class="inline-flex h-10 min-w-[40px] items-center justify-center rounded-md border border-hus-blue/30 bg-blue-50/40 px-2.5 text-hus-blue transition-colors hover:bg-hus-blue hover:text-white hover:border-hus-blue sm:h-[46px] sm:min-w-[46px]"
                            aria-label="Tìm đồng tác giả sinh viên">
                      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="7"></circle>
                        <path d="m20 20-3.5-3.5"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <p class="text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                    Danh sách đồng tác giả đã chọn
                  </p>

                  <div class="border border-gray-100 p-3 sm:p-4 space-y-2">
                    <div *ngIf="selectedCoAuthors.length > 0" class="space-y-2">
                      <div *ngFor="let author of selectedCoAuthors"
                           class="flex flex-col gap-3 rounded-md border-2 border-gray-300 bg-white px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                        <div>
                          <p class="text-[13px] sm:text-sm font-black text-gray-900">{{ author.fullName }}</p>
                          <p class="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400">
                            {{ author.studentId ? ('Mã sinh viên: ' + author.studentId) : 'Đồng tác giả sinh viên đã liên kết' }}
                          </p>
                        </div>

                        <button type="button"
                                (click)="removeCoAuthor(author.userId)"
                                class="inline-flex h-9 sm:h-10 items-center justify-center px-3 sm:px-4 rounded-md border border-gray-200 text-gray-600 text-[10px] sm:text-[11px] font-semibold hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                          Bỏ khỏi bài viết
                        </button>
                      </div>
                    </div>

                    <p *ngIf="selectedCoAuthors.length === 0"
                       class="text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Chưa có đồng tác giả sinh viên nào được thêm.
                    </p>
                  </div>

                  <div *ngIf="isSearchingCoAuthors"
                       class="mt-3 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Đang tìm sinh viên...
                  </div>

                  <div *ngIf="!isSearchingCoAuthors && coAuthorSearchResults.length > 0"
                       class="mt-3 border border-gray-100 overflow-hidden">
                    <div class="divide-y divide-gray-100">
                      <div *ngFor="let candidate of coAuthorSearchResults"
                           class="flex flex-col gap-3 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                        <div>
                          <p class="text-[13px] sm:text-sm font-black text-gray-900">{{ candidate.fullName }}</p>
                          <p class="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400">
                            Mã sinh viên: {{ candidate.studentId }}
                          </p>
                        </div>

                        <button type="button"
                                (click)="addCoAuthor(candidate)"
                                class="inline-flex h-9 sm:h-10 items-center justify-center gap-1 px-3 sm:px-4 rounded-md border border-hus-blue/30 bg-blue-50/40 text-hus-blue text-[10px] sm:text-[11px] font-semibold hover:bg-hus-blue hover:text-white hover:border-hus-blue transition-colors">
                          Thêm đồng tác giả
                        </button>
                      </div>
                    </div>
                  </div>

                  <p *ngIf="!isSearchingCoAuthors && coAuthorSearchMessage"
                     class="mt-3 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    {{ coAuthorSearchMessage }}
                  </p>
                </div>
              </article>

              <article class="py-3 sm:py-5 space-y-4">
                <h2 class="text-[11px] sm:text-[13px] font-black uppercase tracking-widest text-hus-blue">Nội dung nghiên cứu</h2>

                <div class="w-full">
                  <label class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                    Tóm tắt
                  </label>
                  <div class="w-full border-2 border-gray-300 rounded-md bg-white overflow-hidden focus-within:border-hus-blue transition-colors">
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
                      <div class="min-h-[220px] px-4 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-300">
                        Đang tải nội dung tóm tắt...
                      </div>
                    </ng-template>
                  </div>
                  
                </div>

                <div>
                  <label for="pdfFile" class="block text-[10px] sm:text-[11px] font-black text-black uppercase tracking-widest mb-2">
                    Tệp PDF hiển thị
                  </label>
                  <input #pdfFileInput
                         id="pdfFile"
                         type="file"
                         accept="application/pdf,.pdf"
                         (change)="onPdfSelected($event)"
                         class="hidden">

                  <div class="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 transition-colors focus-within:border-hus-blue sm:px-4 sm:py-3">
                    <div class="flex items-center gap-2">
                      <button type="button"
                              (click)="triggerPdfPicker(pdfFileInput)"
                              class="inline-flex h-9 w-fit items-center justify-center rounded-md bg-hus-blue px-2.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-hus-dark transition-colors sm:h-9 sm:px-3 sm:text-[11px]">
                        Choose file
                      </button>

                      <p class="min-w-0 flex-1 text-[12px] sm:text-[13px] font-medium text-gray-600 break-all leading-5">
                        {{ selectedPdfName || (existingPdfUrl ? existingPdfFileName : 'No file chosen') }}
                      </p>

                      <button *ngIf="effectivePdfUrl || selectedPdfName"
                              type="button"
                              (click)="removePdfAttachment()"
                              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              aria-label="Gỡ PDF"
                              title="Gỡ PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12m4-12v12m4-12v12M5 7l1 13a1 1 0 001 1h10a1 1 0 001-1l1-13" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="mt-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400 space-y-2">

                    <a *ngIf="effectivePdfUrl"
                       [href]="effectivePdfUrl"
                       target="_blank"
                       class="inline-block text-hus-blue hover:text-hus-dark transition underline underline-offset-2">
                      Xem PDF đang dùng
                    </a>
                  </div>
                </div>
              </article>

              <p *ngIf="errorMessage" class="text-[10px] sm:text-[11px] font-bold text-red-600 uppercase tracking-wider">
                {{ errorMessage }}
              </p>

              <p *ngIf="successMessage" class="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                {{ successMessage }}
              </p>

              <div class="pt-4 border-t border-gray-100">
                <div class="flex items-center gap-2 sm:justify-between lg:justify-end lg:gap-3">
                    <button type="button"
                          (click)="cancel()"
                          class="inline-flex h-10 shrink-0 items-center justify-center px-3 border border-gray-200 rounded-md text-gray-600 text-[11px] sm:text-[11px] font-semibold hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                    Hủy
                  </button>

                  <div class="ml-auto flex items-center gap-2 sm:gap-2">
                    <button type="button"
                            (click)="openPreviewModal()"
                            class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 px-3 border border-hus-blue/30 rounded-md bg-blue-50/40 text-hus-blue text-[11px] sm:text-[11px] font-semibold hover:bg-hus-blue hover:text-white hover:border-hus-blue transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span class="sm:hidden">Xem trước</span>
                      <span class="hidden sm:inline">Xem preview</span>
                    </button>

                    <button type="submit"
                            [disabled]="isSaving"
                            class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 px-3 rounded-md bg-hus-blue text-white text-[11px] sm:text-[11px] font-semibold hover:bg-hus-dark transition-colors shadow-[0_10px_24px_-16px_rgba(30,102,170,0.9)] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span class="sm:hidden">{{ isSaving ? 'Đang lưu...' : (isEditMode ? 'Cập nhật' : 'Lưu') }}</span>
                      <span class="hidden sm:inline">{{ isSaving ? 'Đang lưu...' : (isEditMode ? 'Cập nhật bài viết' : 'Lưu bài viết') }}</span>
                    </button>
                  </div>
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

      <div *ngIf="showPreviewModal" class="fixed inset-0 z-[120] flex items-stretch justify-center p-0 sm:items-center sm:p-6">
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" (click)="closePreviewModal()"></div>
        <div class="relative flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:border sm:border-gray-100">
          <div class="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">Bản xem trước bài nghiên cứu</p>
            <button type="button"
                    (click)="closePreviewModal()"
                    class="w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-hus-blue hover:bg-blue-50 transition-colors"
                    aria-label="Đóng xem trước">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-3 sm:p-6">
            <div class="bg-white border-0 sm:border sm:border-gray-100 p-4 sm:p-5">
              <div class="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                <span class="text-hus-blue">{{ previewResearchArea() }}</span>
                <span class="text-gray-300">|</span>
                <span class="text-gray-400">{{ previewPaperTypeLabel() }}</span>
                <span class="text-gray-300">|</span>
                <span class="text-gray-400">{{ publicationYear }}</span>
                <span class="text-gray-300">|</span>
                <span class="text-gray-400">{{ previewCategoryLabel() }}</span>
              </div>

              <h3 class="mt-4 text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                {{ previewTitle() }}
              </h3>

              <div class="mt-4 flex flex-wrap items-center gap-2">
                <span *ngFor="let author of previewAuthors()"
                      class="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-600">
                  {{ author }}
                </span>
              </div>

              <div class="mt-6 border-t border-gray-100 pt-5">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Tóm tắt</p>
                <div class="text-sm leading-7 text-gray-700 break-words" [innerHTML]="previewAbstractHtml()"></div>
              </div>

              <div class="mt-6 border-t border-gray-100 pt-5">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Tệp PDF</p>
                <a *ngIf="effectivePdfUrl; else noPreviewPdf"
                   [href]="effectivePdfUrl"
                   target="_blank"
                   class="inline-flex h-9 items-center justify-center gap-1 px-3 rounded-md border border-hus-blue/30 bg-blue-50/40 text-hus-blue text-[10px] font-semibold hover:bg-hus-blue hover:text-white hover:border-hus-blue transition-colors">
                  Xem PDF đang dùng
                </a>
                <ng-template #noPreviewPdf>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Chưa có file PDF.</p>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResearchEditorComponent implements OnInit, OnDestroy {
  private static readonly FIRST_PUBLICATION_YEAR = 2025;

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
  showPreviewModal = false;

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
            pdfUrl: uploadedPdfUrl ?? this.existingPdfUrl ?? ''
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
            this.scrollToTop();
            return;
          }

          this.resetEditorForm(currentUser.role);
          this.successMessage = 'Đăng bài thành công. Bạn có thể tiếp tục tạo bài viết mới.';
          this.scrollToTop();
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

  triggerPdfPicker(input: HTMLInputElement): void {
    input.click();
  }

  removePdfAttachment(): void {
    this.selectedPdfFile = null;
    this.selectedPdfName = '';
    this.existingPdfUrl = null;
    this.revokeSelectedPreviewUrl();
    this.errorMessage = '';
  }

  cancel(): void {
    this.router.navigateByUrl(ROUTES.RESEARCH_MY_PAPERS);
  }

  openPreviewModal(): void {
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
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
    if (!this.coAuthorSearchKeyword.trim()) {
      this.coAuthorSearchResults = [];
      this.coAuthorSearchMessage = '';
      this.isSearchingCoAuthors = false;
    }
  }

  triggerCoAuthorSearch(): void {
    this.coAuthorSearchInput$.next(this.coAuthorSearchKeyword);
  }

  isAbstractBlank(): boolean {
    return !this.toPlainText(this.abstract);
  }

  isKnownResearchArea(name: string): boolean {
    return this.researchCategories.some((category) => category.name === name);
  }

  previewTitle(): string {
    return this.title.trim() || 'Bài nghiên cứu chưa có tiêu đề';
  }

  previewResearchArea(): string {
    return this.selectedResearchArea.trim() || 'Chưa phân loại';
  }

  previewPaperTypeLabel(): string {
    return this.selectedPaperType === 'GRADUATION_THESIS' ? 'Khóa luận tốt nghiệp' : 'Nghiên cứu khoa học';
  }

  previewCategoryLabel(): string {
    return this.selectedCategory === 'LECTURER' ? 'Giảng viên' : 'Sinh viên';
  }

  previewAbstractHtml(): string {
    const normalized = normalizeRichTextHtml((this.abstract ?? '').trim());
    return normalized || '<p class="text-gray-400">Chưa có nội dung tóm tắt.</p>';
  }

  previewAuthors(): string[] {
    const authorNames = [
      this.previewMainAuthorName(),
      ...this.selectedCoAuthors.map((author) => author.fullName?.trim() || '').filter((name) => name.length > 0)
    ];
    return [...new Set(authorNames.filter((name) => name.length > 0))];
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
      const hasCurrentUserMatch = items.some((item) => item.userId === currentUserId);
      const hasSelectedMatch = items.some((item) => this.hasSelectedCoAuthor(item.userId));
      const availableItems = items.filter((item) => item.userId !== currentUserId && !this.hasSelectedCoAuthor(item.userId));
      this.coAuthorSearchResults = availableItems;

      if (availableItems.length > 0) {
        this.coAuthorSearchMessage = '';
      } else if (hasCurrentUserMatch && items.length === 1) {
        this.coAuthorSearchMessage = 'Không thể thêm chính bạn làm đồng tác giả.';
      } else if (hasSelectedMatch || hasCurrentUserMatch) {
        this.coAuthorSearchMessage = 'Sinh viên này đã có trong danh sách đồng tác giả.';
      } else {
        this.coAuthorSearchMessage = 'Không tìm thấy sinh viên phù hợp.';
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

  private previewMainAuthorName(): string {
    const requestedName = this.authorName.trim();
    if (requestedName) {
      return requestedName;
    }
    return authSignal.user()?.fullName?.trim() || 'Tác giả chính';
  }

  private buildPublicationYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear + 1; year >= ResearchEditorComponent.FIRST_PUBLICATION_YEAR; year -= 1) {
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

  private scrollToTop(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
