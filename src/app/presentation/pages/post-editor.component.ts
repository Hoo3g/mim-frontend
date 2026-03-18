import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ROUTES } from '../../core/constants/route.const';
import { authSignal } from '../../core/signals/auth.signal';
import { JobType, Post, PostType } from '../../core/models/post.model';
import { PostEditorPayload, PostService } from '../../core/services/post.service';
import { ProfileMeResponse } from '../../core/models/profile.model';
import { ProfileService } from '../../core/services/profile.service';
import { ResearchPaper } from '../../core/models/research-paper.model';
import { ResearchPaperService } from '../../core/services/research-paper.service';
import { finalize } from 'rxjs';

type PostingMode = 'JOB' | 'INTERNSHIP';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bg-white min-h-screen">
      <div class="border-b border-gray-100 bg-blue-50/50 py-3 px-3 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <a [routerLink]="ROUTES.RECRUITMENT_MY_POSTS" class="text-hus-blue hover:text-hus-dark transition">
            Bài tuyển dụng của tôi
          </a>
          <span class="text-gray-300">/</span>
          <span class="text-hus-blue opacity-70">{{ isEditMode ? 'Chỉnh sửa' : 'Soạn thảo' }}</span>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-10 md:py-12">
          <section class="min-w-0">
            <div class="bg-white border border-gray-100 p-6 md:p-8">
              <h1 class="text-3xl md:text-4xl font-black text-gray-900 leading-tight uppercase tracking-tighter">
                {{ isEditMode ? 'Chỉnh sửa bài tuyển dụng' : 'Soạn bài tuyển dụng mới' }}
              </h1>
              <p class="mt-4 text-sm text-gray-400 font-bold uppercase tracking-widest">
                {{ isCompanyRole
                  ? 'Doanh nghiệp: đăng nhu cầu tuyển dụng và yêu cầu công việc.'
                  : 'Sinh viên: đăng hồ sơ ứng tuyển và thành tích nổi bật.' }}
              </p>

              <div class="mt-4 inline-flex items-center gap-2 border border-gray-200 px-3 py-2">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Chế độ tài khoản</span>
                <span class="text-[10px] font-black uppercase tracking-widest"
                      [ngClass]="isCompanyRole ? 'text-hus-blue' : 'text-emerald-600'">
                  {{ isCompanyRole ? 'Doanh nghiệp' : 'Sinh viên' }}
                </span>
              </div>
              

              <div *ngIf="roleBlocked"
                   class="mt-8 border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-xs font-bold uppercase tracking-widest">
                Chỉ tài khoản sinh viên hoặc doanh nghiệp mới có thể thao tác bài đăng tuyển dụng.
              </div>

              <div *ngIf="loading"
                   class="mt-8 border border-dashed border-gray-200 px-4 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Đang tải dữ liệu bài đăng...
              </div>

              <form *ngIf="!roleBlocked && !loading" class="mt-8 space-y-5" (ngSubmit)="save()">
                <article class="border border-gray-100 p-5 space-y-4">
                  <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-900">Thông tin chính</h2>

                  <div>
                    <label for="title" class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Tiêu đề bài đăng
                    </label>
                    <input id="title"
                           name="title"
                           type="text"
                           [(ngModel)]="form.title"
                           maxlength="255"
                           required
                           class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                           placeholder="Ví dụ: Tuyển thực tập sinh Data Analyst">
                  </div>

                  <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Loại bài đăng
                      </label>
                      <select [(ngModel)]="postingMode"
                              name="postingMode"
                              (ngModelChange)="onPostingModeChange()"
                              class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors">
                        <option value="JOB">Việc làm</option>
                        <option value="INTERNSHIP">Thực tập</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Hình thức làm việc
                      </label>
                      <select [(ngModel)]="form.jobType"
                              name="jobType"
                              class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors">
                        <option [ngValue]="JOB_TYPES.FULL_TIME">Toàn thời gian</option>
                        <option [ngValue]="JOB_TYPES.PART_TIME">Bán thời gian</option>
                        <option [ngValue]="JOB_TYPES.CONTRACT">Hợp đồng</option>
                        <option [ngValue]="JOB_TYPES.INTERNSHIP">Thực tập</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {{ isCompanyRole ? 'Mô tả chi tiết' : 'Giới thiệu' }}
                    </label>
                    <textarea [(ngModel)]="form.description"
                              name="description"
                              rows="6"
                              required
                              class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                              [placeholder]="isCompanyRole
                                ? 'Mô tả công việc, mục tiêu hoặc thông tin bạn muốn chia sẻ...'
                                : 'Giới thiệu bản thân, kinh nghiệm, định hướng...'"
                    ></textarea>
                  </div>
                </article>

                <article class="border border-gray-100 p-5 space-y-4">
                  <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-900">Nội dung theo vai trò</h2>

                  <div *ngIf="isCompanyRole">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Yêu cầu công việc
                    </label>
                    <textarea [(ngModel)]="form.requirements"
                              name="requirements"
                              rows="4"
                              class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                              placeholder="Yêu cầu kỹ năng, kinh nghiệm, công nghệ..."></textarea>
                  </div>

                  <div *ngIf="isCompanyRole">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Quyền lợi
                    </label>
                    <textarea [(ngModel)]="form.benefits"
                              name="benefits"
                              rows="4"
                              class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                              placeholder="Lương thưởng, môi trường, phúc lợi..."></textarea>
                  </div>

                  <div *ngIf="!isCompanyRole">
                    <div class="flex items-center justify-between gap-3 mb-2">
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Hồ sơ sinh viên hiển thị trên thẻ tuyển dụng
                      </label>
                      <button type="button"
                              *ngIf="studentProfile"
                              (click)="applyStudentProfilePrefill(true)"
                              class="px-3 py-1.5 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-hus-blue hover:text-hus-blue transition-colors">
                        Lấy từ hồ sơ
                      </button>
                    </div>
                    <div class="grid sm:grid-cols-2 gap-4">
                      <label class="text-xs font-semibold text-gray-500">
                        Trường
                        <input [(ngModel)]="studentCardForm.university"
                               name="studentUniversity"
                               class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                      </label>
                      <label class="text-xs font-semibold text-gray-500">
                        Chuyên ngành
                        <input [(ngModel)]="studentCardForm.major"
                               name="studentMajor"
                               class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                      </label>
                      <label class="text-xs font-semibold text-gray-500">
                        Loại sinh viên
                        <input [(ngModel)]="studentCardForm.studentType"
                               name="studentType"
                               class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                      </label>
                      <label class="text-xs font-semibold text-gray-500">
                        Vị trí mong muốn
                        <input [(ngModel)]="studentCardForm.desiredPosition"
                               name="studentDesiredPosition"
                               class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                      </label>
                    </div>
                    <label class="block text-xs font-semibold text-gray-500">
                      Thành tích
                      <textarea [(ngModel)]="form.achievements"
                                name="achievements"
                                rows="3"
                                class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"
                                placeholder="Ví dụ: GPA, dự án, chứng chỉ, giải thưởng..."></textarea>
                    </label>
                    <label class="block text-xs font-semibold text-gray-500">
                      Mong muốn nghề nghiệp
                      <textarea [(ngModel)]="studentCardForm.careerGoal"
                                name="studentCareerGoal"
                                rows="3"
                                class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"></textarea>
                    </label>
                  </div>

                  <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        {{ isCompanyRole ? 'Địa điểm làm việc' : 'Khu vực mong muốn' }}
                      </label>
                      <input [(ngModel)]="form.location"
                             name="location"
                             type="text"
                             class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                             [placeholder]="isCompanyRole ? 'Hà Nội, Hybrid hoặc Remote' : 'Ví dụ: Hà Nội hoặc Remote'">
                    </div>

                    <div *ngIf="isCompanyRole">
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Khoảng lương
                      </label>
                      <input [(ngModel)]="form.salaryRange"
                             name="salaryRange"
                             type="text"
                             class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                             placeholder="Ví dụ: 12M - 18M">
                    </div>
                  </div>
                </article>

                <article *ngIf="!isCompanyRole" class="border border-gray-100 p-5 space-y-4">
                  <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-900">Đính kèm hồ sơ và nghiên cứu</h2>

                  <div class="border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">CV PDF cho bài đăng</p>

                    <label *ngIf="defaultProfileCvUrl"
                           class="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input type="checkbox"
                             name="useDefaultProfileCv"
                             [(ngModel)]="useDefaultProfileCv"
                             [disabled]="!!uploadedCvUrl"
                             class="h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue" />
                      Dùng CV mặc định từ hồ sơ: <span class="font-bold">{{ cvFileName(defaultProfileCvUrl) }}</span>
                    </label>

                    <p *ngIf="!defaultProfileCvUrl" class="text-xs text-gray-500 font-semibold">
                      Hồ sơ sinh viên chưa có CV mặc định.
                    </p>

                    <div *ngIf="uploadedCvUrl" class="text-xs text-gray-600 font-semibold">
                      CV riêng đã chọn: <span class="text-gray-900 font-bold">{{ uploadedCvFileName || cvFileName(uploadedCvUrl) }}</span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <input type="file"
                             accept="application/pdf,.pdf"
                             (change)="onStudentCvSelected($event)"
                             class="text-[11px] text-gray-500 font-semibold" />

                      <button type="button"
                              *ngIf="uploadedCvUrl"
                              (click)="removeUploadedCv()"
                              class="px-3 py-1.5 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors">
                        Gỡ CV riêng
                      </button>
                    </div>

                    <a *ngIf="resolvedStudentCvUrl()"
                       [href]="resolvedStudentCvUrl()!"
                       target="_blank"
                       class="inline-block text-[10px] font-black uppercase tracking-widest text-hus-blue hover:underline">
                      Xem CV đính kèm
                    </a>

                    <p *ngIf="cvUploadFeedback"
                       class="text-[10px] font-bold uppercase tracking-widest"
                       [ngClass]="cvUploadError ? 'text-red-500' : 'text-emerald-600'">
                      {{ cvUploadFeedback }}
                    </p>
                  </div>

                  <div class="border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">Bài nghiên cứu gắn kèm</p>
                      <span class="text-[10px] font-black uppercase tracking-widest text-hus-blue">
                        {{ selectedResearchPaperIds.size }} đã chọn
                      </span>
                    </div>

                    <div *ngIf="loadingMyPapers"
                         class="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Đang tải danh sách bài nghiên cứu...
                    </div>

                    <div *ngIf="!loadingMyPapers && myResearchPapers.length === 0"
                         class="text-xs text-gray-500 font-semibold">
                      Bạn chưa có bài nghiên cứu cá nhân để đính kèm.
                    </div>

                    <div *ngIf="!loadingMyPapers && myResearchPapers.length > 0"
                         class="max-h-52 overflow-y-auto border border-gray-100 bg-white divide-y divide-gray-100">
                      <label *ngFor="let paper of myResearchPapers"
                             class="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox"
                               [checked]="isPaperSelected(paper.id)"
                               (change)="togglePaperSelection(paper, $event)"
                               class="mt-1 h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue" />
                        <span class="min-w-0">
                          <span class="block text-xs font-bold text-gray-900 leading-snug truncate">{{ paper.title }}</span>
                          <span class="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-1">
                            {{ paper.researchArea }} | {{ paper.publicationYear }}
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </article>

                <article class="border border-gray-100 p-5 space-y-4">
                  <h2 class="text-[11px] font-black uppercase tracking-widest text-gray-900">Liên hệ và trạng thái</h2>

                  <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Email liên hệ
                      </label>
                      <input [(ngModel)]="form.contactEmail"
                             name="contactEmail"
                             type="email"
                             class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                             placeholder="contact@company.com">
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Số điện thoại
                      </label>
                      <input [(ngModel)]="form.contactPhone"
                             name="contactPhone"
                             type="text"
                             class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                             placeholder="0987xxxxxx">
                    </div>
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Thẻ phân loại (phân tách bằng dấu phẩy)
                    </label>
                    <input [(ngModel)]="tagsText"
                           name="tagsText"
                           type="text"
                           class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors"
                           placeholder="AI, Data Science, Java, ...">
                  </div>

                  <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Trạng thái bài đăng
                      </label>
                      <select [(ngModel)]="form.status"
                              name="status"
                              class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue transition-colors">
                        <option value="OPEN">Đang mở</option>
                        <option value="CLOSED">Đã đóng</option>
                        <option value="DRAFT">Nháp</option>
                      </select>
                    </div>
                  </div>
                </article>

                <p *ngIf="errorMessage" class="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                  {{ errorMessage }}
                </p>

                <div class="pt-4 border-t border-gray-100">
                  <div class="grid grid-cols-2 gap-3 lg:flex lg:items-center lg:justify-end">
                    <button type="button"
                            (click)="cancel()"
                            class="inline-flex items-center justify-center gap-2 h-11 px-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                      Hủy
                    </button>

                    <button type="button"
                            (click)="openPreviewModal()"
                            class="inline-flex items-center justify-center gap-2 h-11 px-4 border border-hus-blue/30 bg-blue-50/40 text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-hus-blue hover:text-white hover:border-hus-blue transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Xem preview
                    </button>

                    <button type="submit"
                            [disabled]="saving || cvUploading"
                            class="col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-2 h-11 px-6 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors shadow-[0_10px_24px_-16px_rgba(30,102,170,0.9)] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ saving ? 'Đang lưu...' : (isEditMode ? 'Cập nhật bài đăng' : 'Đăng bài tuyển dụng') }}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
      </div>

      <div *ngIf="showPreviewModal" class="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" (click)="closePreviewModal()"></div>
        <div class="relative w-full max-w-2xl max-h-[90vh] bg-white border border-gray-100 shadow-2xl flex flex-col">
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">Bản xem trước bài đăng</p>
            <button type="button"
                    (click)="closePreviewModal()"
                    class="w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-hus-blue hover:bg-blue-50 transition-colors"
                    aria-label="Đóng xem trước">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-4 sm:p-6 overflow-y-auto">
            <div class="bg-white border border-gray-100 p-5 transition-all duration-300 flex flex-col h-full relative">
              <div class="flex items-start justify-between mb-5">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="relative">
                    <div class="w-11 h-11 bg-white border-2 border-gray-50 shadow-sm overflow-hidden">
                      <img *ngIf="currentUserAvatar()"
                           [src]="currentUserAvatar()!"
                           [alt]="currentUserName()"
                           class="w-full h-full object-cover">
                      <div *ngIf="!currentUserAvatar()"
                           class="w-full h-full flex items-center justify-center bg-gray-50 text-[12px] font-black text-hus-blue/60 uppercase">
                        {{ avatarInitial() }}
                      </div>
                    </div>
                    <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white flex items-center justify-center border border-gray-50 shadow-sm">
                      <div class="w-1.5 h-1.5" [ngClass]="isCompanyRole ? 'bg-hus-blue animate-pulse' : 'bg-green-500'"></div>
                    </div>
                  </div>

                  <div class="min-w-0">
                    <div class="text-[13px] font-black text-gray-900 leading-tight truncate">{{ currentUserName() }}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <span [ngClass]="isCompanyRole ? 'text-hus-blue bg-blue-50/50' : 'text-gray-500 bg-gray-50'"
                            class="text-[7.5px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5">
                        {{ isCompanyRole ? 'Đối tác doanh nghiệp' : 'Ứng viên tiềm năng' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col items-end gap-1">
                  <span class="text-[9px] font-bold text-gray-300 uppercase tabular-nums">{{ today | date:'dd.MM.yyyy' }}</span>
                  <div class="w-4 h-0.5 bg-gray-100"></div>
                </div>
              </div>

              <h3 class="text-base font-bold text-gray-900 mb-2 leading-tight line-clamp-2 min-h-[2.5rem]">
                {{ form.title.trim() || 'Tiêu đề bài đăng sẽ hiển thị ở đây' }}
              </h3>

              <p class="text-[11px] text-gray-500 font-light leading-relaxed mb-4 line-clamp-3 min-h-[3rem]">
                {{ form.description.trim() || 'Mô tả ngắn sẽ xuất hiện trong danh sách tuyển dụng.' }}
              </p>

              <div class="space-y-3 mb-2 flex-grow">
                <div *ngIf="!isCompanyRole" class="border border-gray-100 bg-gray-50/60 p-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div>
                      <p class="text-[8px] font-black uppercase tracking-widest text-gray-400">Trường</p>
                      <p class="text-[10px] font-bold text-gray-900 mt-1 line-clamp-1">{{ displayValue(studentCardForm.university) }}</p>
                    </div>
                    <div>
                      <p class="text-[8px] font-black uppercase tracking-widest text-gray-400">Chuyên ngành</p>
                      <p class="text-[10px] font-bold text-gray-900 mt-1 line-clamp-1">{{ displayValue(studentCardForm.major) }}</p>
                    </div>
                    <div>
                      <p class="text-[8px] font-black uppercase tracking-widest text-gray-400">Loại sinh viên</p>
                      <p class="text-[10px] font-bold text-gray-900 mt-1 line-clamp-1">{{ displayValue(studentCardForm.studentType) }}</p>
                    </div>
                    <div>
                      <p class="text-[8px] font-black uppercase tracking-widest text-gray-400">Vị trí mong muốn</p>
                      <p class="text-[10px] font-bold text-gray-900 mt-1 line-clamp-1">{{ displayValue(studentCardForm.desiredPosition) }}</p>
                    </div>
                  </div>
                </div>

                <div *ngIf="!isCompanyRole" class="pt-3 border-t border-gray-50">
                  <h4 class="text-[8px] font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-gray-900"></span>
                    Giới thiệu
                  </h4>
                  <p class="text-[10px] text-gray-600 leading-relaxed font-medium line-clamp-3">{{ displayValue(form.description) }}</p>
                </div>

                <div *ngIf="!isCompanyRole" class="pt-3 border-t border-gray-50">
                  <h4 class="text-[8px] font-bold text-hus-blue uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-hus-blue"></span>
                    Thành tích nổi bật
                  </h4>
                  <p class="text-[10px] text-gray-600 leading-relaxed font-medium line-clamp-3">{{ displayValue(form.achievements) }}</p>
                </div>

                <div *ngIf="!isCompanyRole" class="pt-3 border-t border-gray-50">
                  <h4 class="text-[8px] font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-gray-900"></span>
                    Mong muốn nghề nghiệp
                  </h4>
                  <p class="text-[10px] text-gray-600 leading-relaxed font-medium line-clamp-3">{{ displayValue(studentCardForm.careerGoal) }}</p>
                </div>

                <div *ngIf="isCompanyRole && form.requirements.trim()" class="pt-3 border-t border-gray-50">
                  <h4 class="text-[8px] font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-gray-900"></span>
                    Yêu cầu công việc
                  </h4>
                  <p class="text-[10px] text-gray-600 leading-relaxed font-medium line-clamp-3">{{ form.requirements }}</p>
                </div>

                <div *ngIf="!isCompanyRole && resolvedStudentCvUrl()" class="pt-3 border-t border-gray-50">
                  <h4 class="text-[8px] font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-gray-900"></span>
                    CV đính kèm
                  </h4>
                  <p class="text-[10px] text-gray-600 font-medium truncate">{{ cvFileName(resolvedStudentCvUrl()!) }}</p>
                </div>

                <div *ngIf="!isCompanyRole && selectedResearchPaperItems().length > 0" class="pt-3 border-t border-gray-50">
                  <h4 class="text-[8px] font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-gray-900"></span>
                    Bài nghiên cứu đính kèm
                  </h4>
                  <p class="text-[10px] text-gray-600 font-medium">
                    {{ selectedResearchPaperItems().length }} bài nghiên cứu
                  </p>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="truncate">{{ form.location.trim() || 'Chưa cập nhật địa điểm' }}</span>
                  </div>
                  <div *ngIf="isCompanyRole && form.salaryRange.trim()"
                       class="flex items-center gap-1 text-[9px] font-bold text-hus-blue uppercase tracking-widest">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ form.salaryRange }}</span>
                  </div>
                </div>
                <span class="text-[8px] font-black text-gray-200 uppercase tracking-widest">Xem trước</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PostEditorComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly profileService = inject(ProfileService);
  private readonly researchPaperService = inject(ResearchPaperService);

  protected readonly ROUTES = ROUTES;
  protected readonly JOB_TYPES = JobType;

  isEditMode = false;
  roleBlocked = false;
  isCompanyRole = false;
  loading = false;
  saving = false;
  editingPostId: string | null = null;
  errorMessage = '';
  postingMode: PostingMode = 'JOB';
  today = new Date();
  showPreviewModal = false;

  profilePrefilledNotice = false;
  studentProfile: ProfileMeResponse['student'] | null = null;
  defaultProfileCvUrl = '';
  useDefaultProfileCv = false;
  uploadedCvUrl = '';
  uploadedCvFileName = '';
  cvUploading = false;
  cvUploadFeedback = '';
  cvUploadError = false;

  loadingMyPapers = false;
  myResearchPapers: ResearchPaper[] = [];
  selectedResearchPaperIds = new Set<string>();

  form: {
    title: string;
    description: string;
    requirements: string;
    benefits: string;
    achievements: string;
    location: string;
    salaryRange: string;
    contactEmail: string;
    contactPhone: string;
    jobType: Post['jobType'];
    status: Post['status'];
  } = {
      title: '',
      description: '',
      requirements: '',
      benefits: '',
      achievements: '',
      location: '',
      salaryRange: '',
      contactEmail: '',
      contactPhone: '',
      jobType: JobType.FULL_TIME,
      status: 'OPEN'
    };

  studentCardForm: {
    university: string;
    major: string;
    studentType: string;
    desiredPosition: string;
    careerGoal: string;
  } = {
      university: '',
      major: '',
      studentType: '',
      desiredPosition: '',
      careerGoal: ''
    };

  tagsText = '';

  ngOnInit(): void {
    const currentUser = authSignal.user();
    if (!currentUser) {
      this.router.navigateByUrl(ROUTES.AUTH.LOGIN);
      return;
    }

    if (currentUser.role !== 'STUDENT' && currentUser.role !== 'COMPANY') {
      this.roleBlocked = true;
      return;
    }

    this.isCompanyRole = currentUser.role === 'COMPANY';
    this.form.contactEmail = currentUser.email;

    const postId = this.route.snapshot.paramMap.get('id');
    if (postId) {
      this.isEditMode = true;
      this.editingPostId = postId;
      this.loading = true;
      this.loadPostForEdit(postId, currentUser.id);
    }

    if (!this.isCompanyRole) {
      this.loadStudentProfileAndPrefill();
      this.loadMyResearchPapers(currentUser);
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }

  currentUserName(): string {
    return authSignal.user()?.fullName || 'Người dùng MIM';
  }

  currentUserAvatar(): string | undefined {
    return authSignal.user()?.avatarUrl;
  }

  avatarInitial(): string {
    const name = this.currentUserName().trim();
    if (!name) {
      return 'U';
    }

    const parts = name.split(' ').filter((item) => !!item.trim());
    if (parts.length <= 1) {
      return parts[0]?.charAt(0).toUpperCase() || 'U';
    }

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  onPostingModeChange(): void {
    if (this.postingMode === 'INTERNSHIP') {
      this.form.jobType = JobType.INTERNSHIP;
    } else if (this.form.jobType === JobType.INTERNSHIP) {
      this.form.jobType = JobType.FULL_TIME;
    }
  }

  openPreviewModal(): void {
    this.showPreviewModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
    document.body.style.overflow = 'auto';
  }

  applyStudentProfilePrefill(force = false): void {
    const currentUser = authSignal.user();
    if (!currentUser || currentUser.role !== 'STUDENT' || !this.studentProfile) {
      return;
    }

    const student = this.studentProfile;
    const shouldFill = (value: string) => force || !value.trim();

    if (shouldFill(this.form.title)) {
      this.form.title = this.buildStudentDefaultTitle(student);
    }

    if (shouldFill(this.form.description)) {
      this.form.description = this.buildStudentDefaultDescription(student);
    }

    if (shouldFill(this.form.achievements)) {
      this.form.achievements = (student.achievements ?? '').trim();
    }

    if (shouldFill(this.studentCardForm.university)) {
      this.studentCardForm.university = (student.university ?? '').trim();
    }

    if (shouldFill(this.studentCardForm.major)) {
      this.studentCardForm.major = (student.major ?? '').trim();
    }

    if (shouldFill(this.studentCardForm.studentType)) {
      this.studentCardForm.studentType = (student.studentType ?? '').trim();
    }

    if (shouldFill(this.studentCardForm.desiredPosition)) {
      this.studentCardForm.desiredPosition = (student.desiredPosition ?? '').trim();
    }

    if (shouldFill(this.studentCardForm.careerGoal)) {
      this.studentCardForm.careerGoal = (student.careerGoal ?? '').trim();
    }

    if (shouldFill(this.tagsText)) {
      this.tagsText = this.buildStudentDefaultTags(student).join(', ');
    }

    if (shouldFill(this.form.contactEmail)) {
      this.form.contactEmail = currentUser.email;
    }

    if (this.defaultProfileCvUrl && !this.uploadedCvUrl) {
      this.useDefaultProfileCv = true;
    }

    this.profilePrefilledNotice = true;
  }

  onStudentCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.cvUploadFeedback = 'Vui lòng chọn tệp PDF.';
      this.cvUploadError = true;
      input.value = '';
      return;
    }

    this.cvUploadFeedback = '';
    this.cvUploadError = false;
    this.cvUploading = true;

    this.profileService.uploadDefaultCv(file).subscribe({
      next: (response) => {
        this.uploadedCvUrl = response.fileUrl;
        this.uploadedCvFileName = file.name;
        this.useDefaultProfileCv = false;
        this.cvUploadFeedback = 'Đã tải CV lên thành công cho bài đăng.';
        this.cvUploadError = false;
        this.cvUploading = false;
      },
      error: (error) => {
        this.cvUploadFeedback = error?.error?.message || 'Tải CV thất bại.';
        this.cvUploadError = true;
        this.cvUploading = false;
      }
    });

    input.value = '';
  }

  removeUploadedCv(): void {
    this.uploadedCvUrl = '';
    this.uploadedCvFileName = '';
    if (this.defaultProfileCvUrl) {
      this.useDefaultProfileCv = true;
    }
  }

  resolvedStudentCvUrl(): string | null {
    if (this.isCompanyRole) {
      return null;
    }

    if (this.uploadedCvUrl) {
      return this.uploadedCvUrl;
    }

    if (this.useDefaultProfileCv && this.defaultProfileCvUrl) {
      return this.defaultProfileCvUrl;
    }

    return null;
  }

  togglePaperSelection(paper: ResearchPaper, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedResearchPaperIds.add(paper.id);
    } else {
      this.selectedResearchPaperIds.delete(paper.id);
    }
  }

  isPaperSelected(paperId: string): boolean {
    return this.selectedResearchPaperIds.has(paperId);
  }

  selectedResearchPaperItems(): ResearchPaper[] {
    if (this.selectedResearchPaperIds.size === 0) {
      return [];
    }

    return this.myResearchPapers.filter((paper) => this.selectedResearchPaperIds.has(paper.id));
  }

  cvFileName(url: string): string {
    if (!url) {
      return 'cv.pdf';
    }

    const cleaned = url.split('#')[0].split('?')[0];
    const rawName = cleaned.substring(cleaned.lastIndexOf('/') + 1);
    if (!rawName) {
      return 'cv.pdf';
    }

    try {
      return decodeURIComponent(rawName);
    } catch {
      return rawName;
    }
  }

  displayValue(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    return normalized || 'Chưa cập nhật';
  }

  save(): void {
    const currentUser = authSignal.user();
    if (!currentUser) {
      this.router.navigateByUrl(ROUTES.AUTH.LOGIN);
      return;
    }

    const trimmedTitle = this.form.title.trim();
    const trimmedDescription = this.form.description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      this.errorMessage = 'Vui lòng nhập đầy đủ tiêu đề và mô tả bài đăng.';
      return;
    }

    this.errorMessage = '';
    this.saving = true;

    const payload: PostEditorPayload = {
      title: trimmedTitle,
      description: trimmedDescription,
      postType: this.resolvePostType(currentUser.role),
      jobType: this.postingMode === 'INTERNSHIP' ? JobType.INTERNSHIP : this.form.jobType,
      requirements: this.isCompanyRole ? this.form.requirements : undefined,
      achievements: this.isCompanyRole ? undefined : this.form.achievements,
      benefits: this.isCompanyRole ? this.form.benefits : undefined,
      location: this.form.location,
      salaryRange: this.form.salaryRange,
      contactEmail: this.form.contactEmail,
      contactPhone: this.form.contactPhone,
      status: this.form.status,
      tags: this.parseTags(this.tagsText),
      studentCvUrl: this.isCompanyRole ? undefined : this.resolvedStudentCvUrl() ?? undefined,
      researchPaperLinks: this.isCompanyRole
        ? undefined
        : this.selectedResearchPaperItems().map((paper) => ({
          id: paper.id,
          title: paper.title,
          url: paper.pdfUrl
        })),
      displayInfo: this.isCompanyRole ? undefined : this.buildStudentDisplayInfo()
    };

    this.postService.saveMyPost(payload, currentUser, this.editingPostId ?? undefined)
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({
        next: () => {
          const notice = this.isEditMode
            ? 'Đã cập nhật bài đăng tuyển dụng.'
            : 'Đã tạo bài đăng tuyển dụng mới.';

          this.router.navigateByUrl(ROUTES.RECRUITMENT_MY_POSTS, { state: { notice } });
        },
        error: (error) => {
          if (error?.name === 'TimeoutError') {
            this.errorMessage = 'Kết nối máy chủ quá lâu. Vui lòng thử lại.';
            return;
          }
          this.errorMessage = error?.error?.message || 'Lưu bài đăng thất bại. Vui lòng thử lại.';
        }
      });
  }

  cancel(): void {
    this.closePreviewModal();
    this.router.navigateByUrl(ROUTES.RECRUITMENT_MY_POSTS);
  }

  private loadPostForEdit(postId: string, currentUserId: string): void {
    this.postService.getPostById(postId).subscribe({
      next: (post) => {
        if (!post) {
          this.errorMessage = 'Không tìm thấy bài đăng.';
          this.loading = false;
          return;
        }

        if (post.authorId !== currentUserId) {
          this.errorMessage = 'Bạn không có quyền chỉnh sửa bài đăng này.';
          this.roleBlocked = true;
          this.loading = false;
          return;
        }

        this.patchForm(post);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải dữ liệu bài đăng.';
        this.loading = false;
      }
    });
  }

  private loadStudentProfileAndPrefill(): void {
    this.profileService.getMe().subscribe({
      next: (profile) => {
        this.studentProfile = profile.student ?? null;
        this.defaultProfileCvUrl = (profile.student?.cvUrl ?? '').trim();

        if (!this.uploadedCvUrl) {
          this.useDefaultProfileCv = !!this.defaultProfileCvUrl;
        }

        this.applyStudentProfilePrefill(false);
      }
    });
  }

  private loadMyResearchPapers(currentUser: NonNullable<ReturnType<typeof authSignal.user>>): void {
    this.loadingMyPapers = true;
    this.researchPaperService.getMyPapers(currentUser).subscribe({
      next: (papers) => {
        this.myResearchPapers = papers;
        this.loadingMyPapers = false;
      },
      error: () => {
        this.myResearchPapers = [];
        this.loadingMyPapers = false;
      }
    });
  }

  private patchForm(post: Post): void {
    this.postingMode = post.postType.endsWith('INTERNSHIP') ? 'INTERNSHIP' : 'JOB';

    this.form.title = post.title;
    this.form.description = post.description;
    this.form.requirements = post.requirements ?? '';
    this.form.benefits = post.benefits ?? '';
    this.form.achievements = post.achievements ?? '';
    this.form.location = post.location ?? '';
    this.form.salaryRange = post.salaryRange ?? '';
    this.form.contactEmail = post.contactEmail ?? this.form.contactEmail;
    this.form.contactPhone = post.contactPhone ?? '';
    this.form.jobType = post.jobType;
    this.form.status = post.status;
    this.tagsText = (post.tags ?? []).join(', ');

    if (!this.isCompanyRole) {
      const displayInfo = post.displayInfo;
      this.studentCardForm.university = this.displayInfoValue(displayInfo, 'studentUniversity');
      this.studentCardForm.major = this.displayInfoValue(displayInfo, 'studentMajor');
      this.studentCardForm.studentType = this.displayInfoValue(displayInfo, 'studentType');
      this.studentCardForm.desiredPosition = this.displayInfoValue(displayInfo, 'studentDesiredPosition');
      this.studentCardForm.careerGoal = this.displayInfoValue(displayInfo, 'studentCareerGoal');

      const displayBio = this.displayInfoValue(displayInfo, 'studentBio');
      if (!this.form.description.trim() && displayBio) {
        this.form.description = displayBio;
      }

      const displayAchievements = this.displayInfoValue(displayInfo, 'studentAchievements');
      if (!this.form.achievements.trim() && displayAchievements) {
        this.form.achievements = displayAchievements;
      }

      this.selectedResearchPaperIds.clear();
      (post.researchPaperLinks ?? []).forEach((paper) => {
        if (paper.id) {
          this.selectedResearchPaperIds.add(paper.id);
        }
      });

      const postCvUrl = (post.studentCvUrl ?? '').trim();
      if (postCvUrl) {
        this.uploadedCvUrl = postCvUrl;
        this.uploadedCvFileName = this.cvFileName(postCvUrl);
        this.useDefaultProfileCv = false;
      }
    }
  }

  private buildStudentDisplayInfo(): Post['displayInfo'] | undefined {
    const info: Post['displayInfo'] = {
      studentUniversity: this.normalizeStudentField(this.studentCardForm.university),
      studentMajor: this.normalizeStudentField(this.studentCardForm.major),
      studentType: this.normalizeStudentField(this.studentCardForm.studentType),
      studentDesiredPosition: this.normalizeStudentField(this.studentCardForm.desiredPosition),
      studentBio: this.normalizeStudentField(this.form.description),
      studentCareerGoal: this.normalizeStudentField(this.studentCardForm.careerGoal),
      studentAchievements: this.normalizeStudentField(this.form.achievements)
    };

    const cleanedEntries = Object.entries(info).filter(([, value]) => typeof value === 'string' && !!value.trim());
    if (cleanedEntries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(cleanedEntries) as Post['displayInfo'];
  }

  private displayInfoValue(info: Post['displayInfo'] | undefined, key: string): string {
    const raw = info?.[key];
    return typeof raw === 'string' ? raw.trim() : '';
  }

  private normalizeStudentField(value: string): string | undefined {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }

  private buildStudentDefaultTitle(student: ProfileMeResponse['student']): string {
    const desiredPosition = (student?.desiredPosition ?? '').trim();
    const major = (student?.major ?? '').trim();

    if (desiredPosition) {
      if (this.postingMode === 'INTERNSHIP') {
        return `Sinh viên tìm cơ hội thực tập ${desiredPosition}`;
      }
      return `Sinh viên tìm vị trí ${desiredPosition}`;
    }

    if (major) {
      return `Sinh viên ngành ${major} tìm cơ hội nghề nghiệp`;
    }

    return this.postingMode === 'INTERNSHIP'
      ? 'Sinh viên tìm cơ hội thực tập'
      : 'Sinh viên tìm cơ hội việc làm';
  }

  private buildStudentDefaultDescription(student: ProfileMeResponse['student']): string {
    const blocks: string[] = [];

    const educationParts = [
      (student?.major ?? '').trim(),
      (student?.university ?? '').trim()
    ].filter((item) => !!item);

    if (educationParts.length > 0) {
      blocks.push(`Thông tin học tập: ${educationParts.join(' - ')}`);
    }

    const bio = (student?.bio ?? '').trim();
    if (bio) {
      blocks.push(`Giới thiệu: ${bio}`);
    }

    const goal = (student?.careerGoal ?? '').trim();
    if (goal) {
      blocks.push(`Mục tiêu nghề nghiệp: ${goal}`);
    }

    if (blocks.length === 0) {
      return 'Mong muốn kết nối với doanh nghiệp phù hợp để phát triển kỹ năng và đóng góp vào các dự án thực tế.';
    }

    return blocks.join('\n\n');
  }

  private buildStudentDefaultTags(student: ProfileMeResponse['student']): string[] {
    const values = [
      (student?.major ?? '').trim(),
      (student?.desiredPosition ?? '').trim(),
      (student?.studentType ?? '').trim()
    ].filter((item) => !!item);

    return values.filter((item, index, arr) => arr.indexOf(item) === index);
  }

  private resolvePostType(role: string): PostType {
    if (role === 'COMPANY') {
      return this.postingMode === 'INTERNSHIP'
        ? PostType.COMPANY_RECRUITING_INTERNSHIP
        : PostType.COMPANY_RECRUITING_JOB;
    }

    return this.postingMode === 'INTERNSHIP'
      ? PostType.STUDENT_SEEKING_INTERNSHIP
      : PostType.STUDENT_SEEKING_JOB;
  }

  private parseTags(raw: string): string[] {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => !!item)
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }
}
