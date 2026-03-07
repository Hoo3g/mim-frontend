import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ProfileService } from '../../core/services/profile.service';
import { SpecializationService } from '../../core/services/specialization.service';
import { authSignal } from '../../core/signals/auth.signal';
import {
  CollaboratorItem,
  CompanyPostItem,
  LecturerPaperItem,
  PendingApplicantItem,
  PendingApplicationItem,
  ProfileDashboardResponse,
  ProfileMeResponse,
  SavedPaperItem,
  UpdateCompanyProfileRequest,
  UpdateLecturerProfileRequest,
  UpdateStudentProfileRequest
} from '../../core/models/profile.model';
import { ResearchCategory } from '../../core/models/research-category.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bg-gray-50 min-h-screen">
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div *ngIf="loading" class="text-center py-20 text-gray-400 text-xs uppercase tracking-widest">
          Đang tải thông tin hồ sơ...
        </div>

        <div *ngIf="!loading && errorMessage" class="border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-xs font-bold uppercase tracking-widest">
          {{ errorMessage }}
        </div>

        <div *ngIf="!loading && !errorMessage && me" class="space-y-6">
          <div *ngIf="feedbackMessage"
               class="border px-4 py-3 text-xs font-bold uppercase tracking-widest"
               [ngClass]="feedbackError ? 'border-red-200 bg-red-50 text-red-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600'">
            {{ feedbackMessage }}
          </div>

          <div *ngIf="isStudent()" class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <article class="xl:col-span-2 bg-white border border-gray-100 p-6 space-y-5">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-black uppercase tracking-tight text-gray-900">Hồ sơ sinh viên</h3>
                <div class="flex items-center gap-2">
                  <button *ngIf="!editingStudent"
                          (click)="beginEditStudent()"
                          class="px-4 py-2 border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-hus-blue hover:text-white transition-colors">
                    Chỉnh sửa
                  </button>
                  <button *ngIf="editingStudent"
                          (click)="cancelEditStudent()"
                          class="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-gray-300 hover:text-gray-700 transition-colors">
                    Hủy
                  </button>
                </div>
              </div>

              <div *ngIf="!editingStudent" class="space-y-5">
                <div class="bg-gray-50 border border-gray-100 p-5">
                  <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 bg-white border border-gray-200 overflow-hidden flex items-center justify-center text-hus-blue text-lg font-black">
                      <img *ngIf="me.avatarUrl && !avatarLoadError"
                           [src]="me.avatarUrl!"
                           alt="Avatar"
                           class="w-full h-full object-cover"
                           (error)="onAvatarImageError()" />
                      <span *ngIf="!me.avatarUrl || avatarLoadError">{{ initials() }}</span>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-hus-blue">Sinh viên</p>
                      <p class="text-base font-bold text-gray-900">{{ displayName() }}</p>
                    </div>
                  </div>

                  <div class="grid sm:grid-cols-2 gap-3 text-sm">
                    <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Trường</span><p class="text-gray-900 font-semibold">{{ showValue(me.student?.university) }}</p></div>
                    <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Chuyên ngành</span><p class="text-gray-900 font-semibold">{{ showValue(me.student?.major) }}</p></div>
                    <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Loại sinh viên</span><p class="text-gray-900 font-semibold">{{ showValue(me.student?.studentType) }}</p></div>
                    <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Vị trí mong muốn</span><p class="text-gray-900 font-semibold">{{ showValue(me.student?.desiredPosition) }}</p></div>
                  </div>
                </div>

                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Giới thiệu</p>
                  <p class="text-sm text-gray-700 whitespace-pre-line">{{ showValue(me.student?.bio) }}</p>
                </div>

                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Thành tích</p>
                  <p class="text-sm text-gray-700 whitespace-pre-line">{{ showValue(me.student?.achievements) }}</p>
                </div>

                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Mong muốn nghề nghiệp</p>
                  <p class="text-sm text-gray-700 whitespace-pre-line">{{ showValue(me.student?.careerGoal) }}</p>
                </div>
              </div>

              <div *ngIf="editingStudent" class="space-y-5">
                <div class="grid sm:grid-cols-2 gap-4">
                  <label class="text-xs font-semibold text-gray-500">
                    Họ
                    <input [(ngModel)]="studentForm.firstName" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Tên
                    <input [(ngModel)]="studentForm.lastName" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Trường
                    <input [(ngModel)]="studentForm.university" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Chuyên ngành
                    <select [(ngModel)]="studentForm.major"
                            class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900">
                      <option value="">Chưa chọn chuyên ngành</option>
                      <option *ngFor="let specialization of specializations" [value]="specialization.name">
                        {{ specialization.name }}
                      </option>
                      <option *ngIf="studentForm.major && !isKnownSpecialization(studentForm.major)"
                              [value]="studentForm.major">
                        {{ studentForm.major }} (không còn hoạt động)
                      </option>
                    </select>
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Loại sinh viên
                    <input [(ngModel)]="studentForm.studentType" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Vị trí mong muốn
                    <input [(ngModel)]="studentForm.desiredPosition" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                </div>

                <label class="block text-xs font-semibold text-gray-500">
                  Giới thiệu
                  <textarea [(ngModel)]="studentForm.bio" rows="3" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"></textarea>
                </label>

                <label class="block text-xs font-semibold text-gray-500">
                  Thành tích
                  <textarea [(ngModel)]="studentForm.achievements" rows="3" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"></textarea>
                </label>

                <label class="block text-xs font-semibold text-gray-500">
                  Mong muốn nghề nghiệp
                  <textarea [(ngModel)]="studentForm.careerGoal" rows="3" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"></textarea>
                </label>

                <label class="block text-xs font-semibold text-gray-500">
                  Ảnh đại diện
                  <input type="file"
                         accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                         (change)="onAvatarSelected($event)"
                         class="mt-1 w-full text-xs font-semibold text-gray-500" />
                </label>

                

                <button (click)="saveStudentProfile()"
                        class="px-5 py-2.5 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors">
                  Lưu hồ sơ sinh viên
                </button>
              </div>
            </article>

            <article class="bg-white border border-gray-100 p-6 space-y-4">
              <h3 class="text-sm font-black uppercase tracking-widest text-gray-900">CV mặc định</h3>

              <div *ngIf="!editingStudent" class="text-xs text-gray-400 font-semibold">
                Nhấn <span class="text-hus-blue">Chỉnh sửa</span> để cập nhật CV.
              </div>

              <input *ngIf="editingStudent" type="file" accept="application/pdf,.pdf" (change)="onStudentCvSelected($event)" class="text-xs" />

              <p *ngIf="studentForm.cvUrl"
                 class="text-xs font-semibold text-gray-500">
                File hiện tại:
                <span class="text-gray-900 font-bold">{{ defaultCvFileName() }}</span>
              </p>

              <a *ngIf="studentForm.cvUrl"
                 [href]="studentForm.cvUrl!"
                 target="_blank"
                 class="inline-block text-[10px] font-black uppercase tracking-widest text-hus-blue hover:underline">
                Xem CV hiện tại
              </a>
            </article>
          </div>

          <div *ngIf="isStudent()" class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <article class="bg-white border border-gray-100 p-6">
              <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 mb-4">Bài nghiên cứu đã đánh dấu</h3>
              <div *ngIf="savedPapers().length === 0" class="text-xs text-gray-400 font-semibold uppercase tracking-widest py-8 text-center">
                Chưa có bài nghiên cứu đã lưu.
              </div>
              <div *ngFor="let paper of savedPapers()" class="border border-gray-100 bg-gray-50 px-4 py-3 mb-3">
                <a [routerLink]="['/paper', paper.paperId]" class="text-sm font-bold text-gray-900 hover:text-hus-blue">{{ paper.title }}</a>
                <p class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {{ paper.researchArea || 'Chưa phân loại' }}
                  <span *ngIf="paper.publicationYear"> | {{ paper.publicationYear }}</span>
                </p>
              </div>
            </article>

            <article class="bg-white border border-gray-100 p-6">
              <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 mb-4">Đơn ứng tuyển đang chờ phản hồi</h3>
              <div *ngIf="pendingApplications().length === 0" class="text-xs text-gray-400 font-semibold uppercase tracking-widest py-8 text-center">
                Không có đơn pending.
              </div>
              <div *ngFor="let application of pendingApplications()" class="border border-gray-100 bg-gray-50 px-4 py-3 mb-3">
                <a [routerLink]="['/recruitment']" class="text-sm font-bold text-gray-900 hover:text-hus-blue">{{ application.postTitle }}</a>
                <p class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {{ application.companyName || 'Doanh nghiệp' }}
                  <span *ngIf="application.location"> | {{ application.location }}</span>
                  <span *ngIf="application.status"> | {{ application.status }}</span>
                </p>
              </div>
            </article>
          </div>

          <div *ngIf="isCompany()" class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <article class="xl:col-span-2 bg-white border border-gray-100 p-6 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-black uppercase tracking-tight text-gray-900">Hồ sơ doanh nghiệp</h3>
                <div class="flex items-center gap-2">
                  <button *ngIf="!editingCompany"
                          (click)="beginEditCompany()"
                          class="px-4 py-2 border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-hus-blue hover:text-white transition-colors">
                    Chỉnh sửa
                  </button>
                  <button *ngIf="editingCompany"
                          (click)="cancelEditCompany()"
                          class="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-gray-300 hover:text-gray-700 transition-colors">
                    Hủy
                  </button>
                </div>
              </div>

              <div *ngIf="!editingCompany" class="space-y-4 text-sm">
                <div class="bg-gray-50 border border-gray-100 p-5">
                  <p class="text-[10px] font-black uppercase tracking-widest text-hus-blue mb-1">Doanh nghiệp</p>
                  <p class="text-lg font-bold text-gray-900">{{ showValue(me.company?.name) }}</p>
                  <p class="text-xs text-gray-500 font-semibold mt-1">{{ showValue(me.company?.industry) }}</p>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Website</span><p class="text-gray-900 font-semibold">{{ showValue(me.company?.website) }}</p></div>
                  <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Địa điểm</span><p class="text-gray-900 font-semibold">{{ showValue(me.company?.location) }}</p></div>
                </div>
                <div>
                  <p class="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Giới thiệu</p>
                  <p class="text-gray-700 whitespace-pre-line">{{ showValue(me.company?.description) }}</p>
                </div>
              </div>

              <div *ngIf="editingCompany" class="space-y-4">
                <div class="grid sm:grid-cols-2 gap-4">
                  <label class="text-xs font-semibold text-gray-500">
                    Tên doanh nghiệp
                    <input [(ngModel)]="companyForm.name" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Lĩnh vực
                    <input [(ngModel)]="companyForm.industry" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Website
                    <input [(ngModel)]="companyForm.website" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Địa điểm
                    <input [(ngModel)]="companyForm.location" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                </div>

                <label class="block text-xs font-semibold text-gray-500">
                  Giới thiệu
                  <textarea [(ngModel)]="companyForm.description" rows="4" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"></textarea>
                </label>

                <label class="block text-xs font-semibold text-gray-500">
                  Ảnh đại diện
                  <input type="file"
                         accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                         (change)="onAvatarSelected($event)"
                         class="mt-1 w-full text-xs font-semibold text-gray-500" />
                </label>

                <a *ngIf="me.avatarUrl"
                   [href]="me.avatarUrl!"
                   target="_blank"
                   class="inline-block text-[10px] font-black uppercase tracking-widest text-hus-blue hover:underline">
                  Xem ảnh đại diện hiện tại
                </a>

                <button (click)="saveCompanyProfile()" class="px-5 py-2.5 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors">
                  Lưu hồ sơ doanh nghiệp
                </button>
              </div>
            </article>

            <article class="bg-white border border-gray-100 p-6">
              <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 mb-4">Tin tuyển dụng đã đăng</h3>
              <div *ngIf="companyPosts().length === 0" class="text-xs text-gray-400 font-semibold uppercase tracking-widest py-8 text-center">
                Chưa có bài đăng.
              </div>
              <div *ngFor="let post of companyPosts()" class="border border-gray-100 bg-gray-50 px-4 py-3 mb-3">
                <a [routerLink]="['/recruitment']" class="text-sm font-bold text-gray-900 hover:text-hus-blue">{{ post.title }}</a>
                <p class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {{ post.status || 'N/A' }}
                  <span *ngIf="post.approvalStatus"> | {{ post.approvalStatus }}</span>
                  <span *ngIf="post.pendingCount !== undefined"> | pending: {{ post.pendingCount }}</span>
                </p>
              </div>
            </article>
          </div>

          <article *ngIf="isCompany()" class="bg-white border border-gray-100 p-6">
            <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 mb-4">Ứng viên đang chờ xử lý</h3>
            <div *ngIf="pendingApplicants().length === 0" class="text-xs text-gray-400 font-semibold uppercase tracking-widest py-8 text-center">
              Không có ứng viên pending.
            </div>
            <div *ngFor="let applicant of pendingApplicants()" class="border border-gray-100 bg-gray-50 px-4 py-3 mb-3">
              <p class="text-sm font-bold text-gray-900">{{ applicant.applicantName }}</p>
              <p class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{{ applicant.postTitle }}</p>
              <p *ngIf="applicant.message" class="mt-2 text-xs text-gray-600">{{ applicant.message }}</p>
              <a *ngIf="applicant.cvUrl" [href]="applicant.cvUrl!" target="_blank" class="mt-2 inline-block text-[10px] font-black uppercase tracking-widest text-hus-blue hover:underline">
                Xem CV
              </a>
            </div>
          </article>

          <div *ngIf="isLecturer()" class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <article class="xl:col-span-2 bg-white border border-gray-100 p-6 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-black uppercase tracking-tight text-gray-900">Hồ sơ giảng viên</h3>
                <div class="flex items-center gap-2">
                  <button *ngIf="!editingLecturer"
                          (click)="beginEditLecturer()"
                          class="px-4 py-2 border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-hus-blue hover:text-white transition-colors">
                    Chỉnh sửa
                  </button>
                  <button *ngIf="editingLecturer"
                          (click)="cancelEditLecturer()"
                          class="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-gray-300 hover:text-gray-700 transition-colors">
                    Hủy
                  </button>
                </div>
              </div>

              <div *ngIf="!editingLecturer" class="space-y-4 text-sm">
                <div class="bg-gray-50 border border-gray-100 p-5">
                  <p class="text-[10px] font-black uppercase tracking-widest text-hus-blue mb-1">Giảng viên</p>
                  <p class="text-lg font-bold text-gray-900">{{ displayName() }}</p>
                  <p class="text-xs text-gray-500 font-semibold mt-1">{{ showValue(me.lecturer?.academicRank) }}</p>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Học vị</span><p class="text-gray-900 font-semibold">{{ showValue(me.lecturer?.title) }}</p></div>
                  <div><span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Học hàm</span><p class="text-gray-900 font-semibold">{{ showValue(me.lecturer?.academicRank) }}</p></div>
                </div>
                <div>
                  <p class="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Giới thiệu</p>
                  <p class="text-gray-700 whitespace-pre-line">{{ showValue(me.lecturer?.bio) }}</p>
                </div>
                <div>
                  <p class="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Hướng nghiên cứu</p>
                  <p class="text-gray-700">{{ researchInterestsLabel(me) }}</p>
                </div>
              </div>

              <div *ngIf="editingLecturer" class="space-y-4">
                <div class="grid sm:grid-cols-2 gap-4">
                  <label class="text-xs font-semibold text-gray-500">
                    Họ
                    <input [(ngModel)]="lecturerForm.firstName" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Tên
                    <input [(ngModel)]="lecturerForm.lastName" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Học vị
                    <input [(ngModel)]="lecturerForm.title" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                  <label class="text-xs font-semibold text-gray-500">
                    Học hàm
                    <input [(ngModel)]="lecturerForm.academicRank" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                  </label>
                </div>

                <label class="block text-xs font-semibold text-gray-500">
                  Giới thiệu
                  <textarea [(ngModel)]="lecturerForm.bio" rows="4" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"></textarea>
                </label>

                <label class="block text-xs font-semibold text-gray-500">
                  Hướng nghiên cứu (ngăn cách bằng dấu phẩy)
                  <textarea [(ngModel)]="lecturerInterestsText" rows="3" class="mt-1 w-full border border-gray-200 px-3 py-2 text-sm text-gray-900"></textarea>
                </label>

                <label class="block text-xs font-semibold text-gray-500">
                  Ảnh đại diện
                  <input type="file"
                         accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                         (change)="onAvatarSelected($event)"
                         class="mt-1 w-full text-xs font-semibold text-gray-500" />
                </label>

                <a *ngIf="me.avatarUrl"
                   [href]="me.avatarUrl!"
                   target="_blank"
                   class="inline-block text-[10px] font-black uppercase tracking-widest text-hus-blue hover:underline">
                  Xem ảnh đại diện hiện tại
                </a>

                <button (click)="saveLecturerProfile()" class="px-5 py-2.5 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors">
                  Lưu hồ sơ giảng viên
                </button>
              </div>
            </article>

            <article class="bg-white border border-gray-100 p-6">
              <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 mb-4">Bài nghiên cứu của tôi</h3>
              <div *ngIf="lecturerPapers().length === 0" class="text-xs text-gray-400 font-semibold uppercase tracking-widest py-8 text-center">
                Chưa có bài nghiên cứu.
              </div>
              <div *ngFor="let paper of lecturerPapers()" class="border border-gray-100 bg-gray-50 px-4 py-3 mb-3">
                <a [routerLink]="['/paper', paper.paperId]" class="text-sm font-bold text-gray-900 hover:text-hus-blue">{{ paper.title }}</a>
                <p class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {{ paper.researchArea || 'Chưa phân loại' }}
                  <span *ngIf="paper.publicationYear"> | {{ paper.publicationYear }}</span>
                  <span *ngIf="paper.approvalStatus"> | {{ paper.approvalStatus }}</span>
                </p>
              </div>
            </article>
          </div>

          <article *ngIf="isLecturer()" class="bg-white border border-gray-100 p-6">
            <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 mb-4">Cộng tác giả / sinh viên liên quan</h3>
            <div *ngIf="collaborators().length === 0" class="text-xs text-gray-400 font-semibold uppercase tracking-widest py-8 text-center">
              Chưa có dữ liệu cộng tác.
            </div>
            <div *ngFor="let collaborator of collaborators()" class="border border-gray-100 bg-gray-50 px-4 py-3 mb-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-bold text-gray-900">{{ collaborator.name }}</p>
                <p class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{{ collaborator.collaboratorType || 'N/A' }}</p>
              </div>
              <p class="text-[10px] font-black uppercase tracking-widest text-hus-blue">{{ collaborator.paperCount || 0 }} bài</p>
            </div>
          </article>

          <div *ngIf="isAdmin()" class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <article class="xl:col-span-2 bg-white border border-gray-100 p-6 space-y-5">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-hus-blue mb-1">Quản trị viên</p>
                  <h3 class="text-lg font-black uppercase tracking-tight text-gray-900">{{ displayName() }}</h3>
                </div>
                <a routerLink="/admin"
                   class="px-4 py-2 border border-hus-blue text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-hus-blue hover:text-white transition-colors">
                  Mở trang quản trị
                </a>
              </div>

              <div class="bg-gray-50 border border-gray-100 p-5 grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Email</span>
                  <p class="text-gray-900 font-semibold">{{ me.email }}</p>
                </div>
                <div>
                  <span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Trạng thái</span>
                  <p class="text-gray-900 font-semibold">{{ showValue(me.accountStatus) }}</p>
                </div>
                <div class="sm:col-span-2">
                  <span class="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Mã tài khoản</span>
                  <p class="text-gray-900 font-semibold break-all">{{ me.userId }}</p>
                </div>
              </div>

              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Quyền quản trị</p>
                <div class="flex flex-wrap gap-2">
                  <span *ngFor="let capability of adminCapabilities()"
                        class="px-2.5 py-1 border border-gray-200 bg-white text-[10px] font-black uppercase tracking-widest text-gray-600">
                    {{ capability }}
                  </span>
                </div>
              </div>
            </article>

            <article class="bg-white border border-gray-100 p-6 space-y-4">
              <h3 class="text-sm font-black uppercase tracking-widest text-gray-900">Lối tắt quản trị</h3>
              <a routerLink="/admin"
                 class="block border border-gray-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-hus-blue hover:text-hus-blue transition-colors">
                Duyệt nội dung
              </a>
              <a routerLink="/admin"
                 class="block border border-gray-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-hus-blue hover:text-hus-blue transition-colors">
                Quản lý phân quyền
              </a>
              <a routerLink="/admin"
                 class="block border border-gray-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-hus-blue hover:text-hus-blue transition-colors">
                Quản lý chuyên ngành dùng chung
              </a>
            </article>
          </div>

          <article *ngIf="isUnknownRole()" class="bg-white border border-gray-100 p-6 text-sm text-gray-500 font-semibold">
            Hồ sơ tài khoản đang dùng role chưa chuẩn hóa. Vui lòng liên hệ quản trị hệ thống để kiểm tra dữ liệu role.
          </article>
        </div>
      </section>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly specializationService = inject(SpecializationService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  errorMessage = '';
  feedbackMessage = '';
  feedbackError = false;
  avatarLoadError = false;

  editingStudent = false;
  editingCompany = false;
  editingLecturer = false;

  me: ProfileMeResponse | null = null;
  dashboard: ProfileDashboardResponse | null = null;
  specializations: ResearchCategory[] = [];

  studentForm: UpdateStudentProfileRequest = {
    firstName: '',
    lastName: '',
    university: '',
    major: '',
    bio: '',
    cvUrl: '',
    studentType: '',
    achievements: '',
    careerGoal: '',
    desiredPosition: ''
  };

  companyForm: UpdateCompanyProfileRequest = {
    name: '',
    industry: '',
    website: '',
    location: '',
    description: '',
    logoUrl: ''
  };

  lecturerForm: UpdateLecturerProfileRequest = {
    firstName: '',
    lastName: '',
    title: '',
    academicRank: '',
    bio: '',
    avatarUrl: '',
    researchInterests: []
  };

  lecturerInterestsText = '';

  ngOnInit(): void {
    this.loadSpecializations();
    this.reload();
  }

  roleLabel(): string {
    if (!this.me) return 'Người dùng';
    const role = this.normalizedRoleValue();
    if (role === 'STUDENT') return 'Sinh viên';
    if (role === 'COMPANY') return 'Doanh nghiệp';
    if (role === 'LECTURER') return 'Giảng viên';
    if (role === 'ADMIN') return 'Quản trị viên';
    return 'Quản trị viên';
  }

  displayName(): string {
    if (!this.me) return 'Người dùng MIM';
    const role = this.normalizedRoleValue();

    if (role === 'COMPANY') {
      const name = this.me.company?.name?.trim();
      return name || this.emailName(this.me.email);
    }

    if (role === 'STUDENT') {
      const fullName = `${this.me.student?.firstName || ''} ${this.me.student?.lastName || ''}`.trim();
      return fullName || this.emailName(this.me.email);
    }

    if (role === 'LECTURER') {
      const title = this.me.lecturer?.title?.trim();
      const fullName = `${this.me.lecturer?.firstName || ''} ${this.me.lecturer?.lastName || ''}`.trim();
      if (title && fullName) return `${title} ${fullName}`;
      return fullName || this.emailName(this.me.email);
    }

    return this.emailName(this.me.email);
  }

  initials(): string {
    const display = this.displayName();
    const parts = display.split(' ').filter((item) => !!item.trim());
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  showValue(value?: string | null): string {
    if (!value || !value.trim()) {
      return 'Chưa cập nhật';
    }
    return value;
  }

  defaultCvFileName(): string {
    const url = this.studentForm.cvUrl;
    if (!url) {
      return '';
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

  researchInterestsLabel(me: ProfileMeResponse): string {
    const interests = me.lecturer?.researchInterests || [];
    if (!interests.length) {
      return 'Chưa cập nhật';
    }
    return interests.join(', ');
  }

  isStudent(): boolean {
    return this.normalizedRoleValue() === 'STUDENT';
  }

  isCompany(): boolean {
    return this.normalizedRoleValue() === 'COMPANY';
  }

  isLecturer(): boolean {
    return this.normalizedRoleValue() === 'LECTURER';
  }

  isAdmin(): boolean {
    return this.normalizedRoleValue() === 'ADMIN';
  }

  isUnknownRole(): boolean {
    const role = this.normalizedRoleValue();
    return !!role
      && role !== 'STUDENT'
      && role !== 'COMPANY'
      && role !== 'LECTURER'
      && role !== 'ADMIN';
  }

  savedPapers(): SavedPaperItem[] {
    return this.dashboard?.student?.savedPapers ?? [];
  }

  pendingApplications(): PendingApplicationItem[] {
    return this.dashboard?.student?.pendingApplications ?? [];
  }

  companyPosts(): CompanyPostItem[] {
    return this.dashboard?.company?.myPosts ?? [];
  }

  pendingApplicants(): PendingApplicantItem[] {
    return this.dashboard?.company?.pendingApplicants ?? [];
  }

  lecturerPapers(): LecturerPaperItem[] {
    return this.dashboard?.lecturer?.myPapers ?? [];
  }

  collaborators(): CollaboratorItem[] {
    return this.dashboard?.lecturer?.collaborators ?? [];
  }

  isEditingProfile(): boolean {
    return this.editingStudent || this.editingCompany || this.editingLecturer;
  }

  isKnownSpecialization(name?: string | null): boolean {
    if (!name) {
      return false;
    }
    return this.specializations.some((item) => item.name === name);
  }

  onAvatarImageError(): void {
    this.avatarLoadError = true;
  }

  beginEditStudent(): void {
    this.editingStudent = true;
    this.feedbackMessage = '';
  }

  cancelEditStudent(): void {
    if (this.me) {
      this.patchForms(this.me);
    }
    this.editingStudent = false;
    this.feedbackMessage = '';
  }

  beginEditCompany(): void {
    this.editingCompany = true;
    this.feedbackMessage = '';
  }

  cancelEditCompany(): void {
    if (this.me) {
      this.patchForms(this.me);
    }
    this.editingCompany = false;
    this.feedbackMessage = '';
  }

  beginEditLecturer(): void {
    this.editingLecturer = true;
    this.feedbackMessage = '';
  }

  cancelEditLecturer(): void {
    if (this.me) {
      this.patchForms(this.me);
    }
    this.editingLecturer = false;
    this.feedbackMessage = '';
  }

  saveStudentProfile(): void {
    this.feedbackMessage = '';
    this.profileService.updateStudentProfile(this.studentForm).subscribe({
      next: () => {
        this.setSuccess('Đã lưu hồ sơ sinh viên');
        this.editingStudent = false;
        this.reload();
      },
      error: (error) => this.setError(error?.error?.message || 'Lưu hồ sơ sinh viên thất bại')
    });
  }

  saveCompanyProfile(): void {
    this.feedbackMessage = '';
    this.profileService.updateCompanyProfile(this.companyForm).subscribe({
      next: () => {
        this.setSuccess('Đã lưu hồ sơ doanh nghiệp');
        this.editingCompany = false;
        this.reload();
      },
      error: (error) => this.setError(error?.error?.message || 'Lưu hồ sơ doanh nghiệp thất bại')
    });
  }

  saveLecturerProfile(): void {
    const interests = this.lecturerInterestsText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => !!item);

    this.lecturerForm.researchInterests = interests;
    this.feedbackMessage = '';

    this.profileService.updateLecturerProfile(this.lecturerForm).subscribe({
      next: () => {
        this.setSuccess('Đã lưu hồ sơ giảng viên');
        this.editingLecturer = false;
        this.reload();
      },
      error: (error) => this.setError(error?.error?.message || 'Lưu hồ sơ giảng viên thất bại')
    });
  }

  onStudentCvSelected(event: Event): void {
    if (!this.editingStudent) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.feedbackMessage = '';
    this.profileService.uploadDefaultCv(file).subscribe({
      next: (uploaded) => {
        this.studentForm.cvUrl = uploaded.fileUrl;
        this.setSuccess('Upload CV mặc định thành công');
        this.reload();
      },
      error: (error) => this.setError(error?.error?.message || 'Upload CV thất bại')
    });
  }

  onAvatarSelected(event: Event): void {
    if (!this.isEditingProfile()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.feedbackMessage = '';
    this.profileService.uploadAvatar(file).subscribe({
      next: (uploaded) => {
        if (this.me) {
          this.me = { ...this.me, avatarUrl: uploaded.fileUrl };
        }
        this.avatarLoadError = false;
        authSignal.updateAvatar(uploaded.fileUrl);
        this.setSuccess('Cập nhật avatar thành công');
      },
      error: (error) => this.setError(error?.error?.message || 'Cập nhật avatar thất bại')
    });
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      me: this.profileService.getMe(),
      dashboard: this.profileService.getDashboard()
    }).subscribe({
      next: ({ me, dashboard }) => {
        this.ngZone.run(() => {
          this.me = me;
          this.avatarLoadError = false;
          this.dashboard = dashboard;
          this.patchForms(me);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.errorMessage = error?.error?.message || 'Không thể tải dữ liệu profile';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadSpecializations(): void {
    this.specializationService.getActiveSpecializations().subscribe((items) => {
      this.specializations = items;
      this.cdr.detectChanges();
    });
  }

  private patchForms(me: ProfileMeResponse): void {
    this.studentForm = {
      firstName: me.student?.firstName ?? '',
      lastName: me.student?.lastName ?? '',
      university: me.student?.university ?? '',
      major: me.student?.major ?? '',
      bio: me.student?.bio ?? '',
      cvUrl: me.student?.cvUrl ?? '',
      studentType: me.student?.studentType ?? '',
      achievements: me.student?.achievements ?? '',
      careerGoal: me.student?.careerGoal ?? '',
      desiredPosition: me.student?.desiredPosition ?? ''
    };

    this.companyForm = {
      name: me.company?.name ?? '',
      industry: me.company?.industry ?? '',
      website: me.company?.website ?? '',
      location: me.company?.location ?? '',
      description: me.company?.description ?? '',
      logoUrl: me.company?.logoUrl ?? ''
    };

    this.lecturerForm = {
      firstName: me.lecturer?.firstName ?? '',
      lastName: me.lecturer?.lastName ?? '',
      title: me.lecturer?.title ?? '',
      academicRank: me.lecturer?.academicRank ?? '',
      bio: me.lecturer?.bio ?? '',
      avatarUrl: me.lecturer?.avatarUrl ?? '',
      researchInterests: me.lecturer?.researchInterests ?? []
    };

    this.lecturerInterestsText = (me.lecturer?.researchInterests ?? []).join(', ');
  }

  private emailName(email: string): string {
    return email.split('@')[0] || email;
  }

  private setSuccess(message: string): void {
    this.feedbackMessage = message;
    this.feedbackError = false;
  }

  private setError(message: string): void {
    this.feedbackMessage = message;
    this.feedbackError = true;
  }

  adminCapabilities(): string[] {
    const role = this.normalizedRoleValue();
    if (role !== 'ADMIN') {
      return [];
    }

    const user = authSignal.user();
    const permissions = user?.permissions ?? [];
    if (permissions.length === 0) {
      return ['Toàn quyền quản trị'];
    }

    const labels = permissions.map((permission) => this.permissionLabel(permission));
    return labels.length > 0 ? labels : ['Toàn quyền quản trị'];
  }

  private normalizedRoleValue(): string {
    const raw = (this.me?.role ?? '').trim().toUpperCase();
    if (!raw) {
      return '';
    }
    return raw.startsWith('ROLE_') ? raw.substring(5) : raw;
  }

  private permissionLabel(permission: string): string {
    switch (permission) {
      case 'ADMIN_DASHBOARD_VIEW':
        return 'Truy cập dashboard admin';
      case 'MODERATION_POSTS_VIEW':
        return 'Xem duyệt tuyển dụng';
      case 'MODERATION_POSTS_ACTION':
        return 'Duyệt tuyển dụng';
      case 'MODERATION_PAPERS_VIEW':
        return 'Xem duyệt nghiên cứu';
      case 'MODERATION_PAPERS_ACTION':
        return 'Duyệt nghiên cứu';
      case 'RESEARCH_HERO_EDIT':
        return 'Chỉnh hero nghiên cứu';
      case 'RESEARCH_CATEGORY_MANAGE':
        return 'Quản lý chuyên ngành';
      case 'RBAC_MANAGE':
        return 'Quản lý phân quyền';
      default:
        return permission;
    }
  }
}
