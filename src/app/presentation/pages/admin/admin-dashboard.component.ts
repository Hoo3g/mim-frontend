import { Component, OnInit, OnDestroy, inject, effect, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, forkJoin, Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';

import { adminNotificationSignal } from '../../../core/signals/admin-notification.signal';
import { AdminModerationService } from '../../../core/services/admin-moderation.service';
import { AdminContentService } from '../../../core/services/admin-content.service';
import { ContentService } from '../../../core/services/content.service';
import { AdminRbacService } from '../../../core/services/admin-rbac.service';
import { AdminResearchCategoryService } from '../../../core/services/admin-research-category.service';
import { AdminSpecializationService } from '../../../core/services/admin-specialization.service';
import { AdminNewsService } from '../../../core/services/admin-news.service';
import { ModerationPaperItem, ModerationPostItem } from '../../../core/models/admin-moderation.model';
import { API_CONFIG } from '../../../core/config/api.config';
import {
    PermissionOverrideDraftEffect,
    RbacPermissionDefinition,
    RbacRolePermission,
    RbacUserAssignment
} from '../../../core/models/rbac.model';
import { ResearchCategory } from '../../../core/models/research-category.model';
import { NewsItem, NewsStatus } from '../../../core/models/news.model';
import { ApprovalStatus } from '../../../core/enums/post-status.enum';
import { authSignal } from '../../../core/signals/auth.signal';
import { Post } from '../../../core/models/post.model';
import { PdfCanvasViewerComponent } from '../../../shared/ui/pdf-canvas-viewer/pdf-canvas-viewer.component';
import { PostDetailComponent } from '../post-detail.component';

type AdminTabKey = 'POSTS' | 'PAPERS' | 'HERO' | 'NEWS' | 'RBAC' | 'SPECIALIZATIONS' | 'PAPER_CATEGORIES';

interface AdminTabConfig {
    key: AdminTabKey;
    label: string;
    helper: string;
    permission: string;
}

interface ModerationDisplayInfoEntry {
    label: string;
    value: string;
    wide?: boolean;
}

const MODERATION_POST_TYPE_LABELS: Record<string, string> = {
    COMPANY_RECRUITING_JOB: 'Doanh nghiệp tuyển nhân sự',
    COMPANY_RECRUITING_INTERNSHIP: 'Doanh nghiệp tuyển thực tập',
    COMPANY_SEEKING_THESIS_PARTNER: 'Doanh nghiệp tìm đối tác luận văn',
    STUDENT_SEEKING_THESIS: 'Sinh viên tìm hướng luận văn',
    STUDENT_SEEKING_JOB: 'Sinh viên tìm việc làm',
    STUDENT_SEEKING_INTERNSHIP: 'Sinh viên tìm thực tập',
    LECTURER_SEEKING_THESIS_STUDENT: 'Giảng viên tìm sinh viên luận văn'
};

const MODERATION_JOB_TYPE_LABELS: Record<string, string> = {
    FULL_TIME: 'Toàn thời gian',
    PART_TIME: 'Bán thời gian',
    CONTRACT: 'Hợp đồng',
    INTERNSHIP: 'Thực tập',
    REMOTE: 'Từ xa',
    HYBRID: 'Kết hợp'
};

const MODERATION_POST_STATUS_LABELS: Record<string, string> = {
    OPEN: 'Đang mở',
    CLOSED: 'Đã đóng',
    DRAFT: 'Bản nháp'
};

const MODERATION_RESEARCH_CATEGORY_LABELS: Record<string, string> = {
    STUDENT: 'Sinh viên',
    LECTURER: 'Giảng viên'
};

const MODERATION_DISPLAY_INFO_LABELS: Record<string, string> = {
    studentUniversity: 'Trường',
    studentMajor: 'Chuyên ngành',
    studentType: 'Loại sinh viên',
    studentDesiredPosition: 'Vị trí mong muốn',
    studentBio: 'Giới thiệu ngắn',
    studentCareerGoal: 'Mong muốn nghề nghiệp',
    studentAchievements: 'Thành tích & project'
};

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, PdfCanvasViewerComponent, PostDetailComponent],
    template: `
    <div class="min-h-screen bg-gray-50/50">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
        <div class="mb-6 border border-gray-100 bg-white p-4 sm:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.32em] text-hus-blue">Khu vực điều phối quản trị</p>
              <h1 class="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-900">Quản trị viên</h1>
              
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
              <div class="border border-gray-100 bg-gray-50 px-4 py-3">
                <p class="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">Chờ duyệt</p>
                <p class="mt-2 text-2xl font-black text-gray-900 tabular-nums">{{ totalPendingCount }}</p>
              </div>
              <div class="border border-gray-100 bg-gray-50 px-4 py-3">
                <p class="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">Tuyển dụng</p>
                <p class="mt-2 text-2xl font-black text-gray-900 tabular-nums">{{ pendingPosts().length }}</p>
              </div>
              <div class="border border-gray-100 bg-gray-50 px-4 py-3">
                <p class="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">Nghiên cứu</p>
                <p class="mt-2 text-2xl font-black text-gray-900 tabular-nums">{{ pendingPapers().length }}</p>
              </div>
              <div class="border border-gray-100 bg-gray-50 px-4 py-3">
                <p class="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">Module mở</p>
                <p class="mt-2 text-2xl font-black text-gray-900 tabular-nums">{{ visibleTabs.length }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          <aside class="bg-white border border-gray-100 p-4 lg:sticky lg:overflow-y-auto"
                 [style.top]="'var(--app-nav-sidebar-offset, 124px)'"
                 [style.maxHeight]="'calc(100vh - var(--app-nav-sidebar-offset, 124px) - 1rem)'">
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Danh mục quản trị</p>
 
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              <button *ngFor="let tab of visibleTabs"
                      type="button"
                      (click)="selectTab(tab.key)"
                      [class.border-hus-blue]="currentTab === tab.key"
                      [class.bg-blue-50]="currentTab === tab.key"
                      [class.text-hus-blue]="currentTab === tab.key"
                      class="w-full border border-gray-200 px-3 py-3 text-left hover:border-hus-blue/40 transition-colors">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[10px] font-black uppercase tracking-widest">{{ tab.label }}</span>
                  <span *ngIf="tabBadge(tab.key) !== null"
                        [class.bg-hus-blue]="currentTab === tab.key"
                        [class.text-white]="currentTab === tab.key"
                        [class.bg-gray-100]="currentTab !== tab.key"
                        [class.text-gray-500]="currentTab !== tab.key"
                        class="min-w-6 h-6 px-2 inline-flex items-center justify-center rounded-full text-[10px] font-black tabular-nums">
                    {{ tabBadge(tab.key) }}
                  </span>
                </div>
                <p class="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  {{ tab.helper }}
                </p>
              </button>
            </div>
          </aside>
 
          <div class="min-w-0">
            <div *ngIf="errorMessage" class="mb-6 border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-4 py-3">
              {{ errorMessage }}
            </div>

            <div *ngIf="moderationNotice" class="mb-6 border border-hus-blue/20 bg-blue-50 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
              {{ moderationNotice }}
            </div>
 
            <div *ngIf="!hasAnyTabAccess()" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
              Tài khoản này chưa được cấp quyền thao tác trong trang quản trị.
            </div>
 
            <div *ngIf="currentTab === 'POSTS' && can('MODERATION_POSTS_VIEW')" class="space-y-4">
              <div *ngIf="pendingPosts().length > 0 && can('MODERATION_POSTS_ACTION')"
                   class="bg-white border border-gray-100 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label class="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-600">
                  <input
                    type="checkbox"
                    class="h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue"
                    [checked]="allPostsSelected"
                    [indeterminate]="somePostsSelected"
                    (change)="toggleAllPosts($any($event.target).checked)">
                  Chọn tất cả ({{ selectedPostCount }}/{{ pendingPosts().length }})
                </label>
                <button
                  type="button"
                  (click)="approveSelectedPosts()"
                  [disabled]="selectedPostCount === 0 || isApprovingSelectedPosts"
                  class="px-5 py-2 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {{ isApprovingSelectedPosts ? 'Đang duyệt...' : 'Duyệt đã chọn (' + selectedPostCount + ')' }}
                </button>
              </div>

              <div *ngFor="let post of pendingPosts()" class="bg-white border border-gray-100 p-6 space-y-4 group hover:border-hus-blue transition-all">
                <div class="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div class="flex items-start gap-4 flex-grow min-w-0">
                    <label *ngIf="can('MODERATION_POSTS_ACTION')" class="pt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        class="h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue"
                        [checked]="isPostSelected(post.id)"
                        (click)="$event.stopPropagation()"
                        (change)="togglePostSelection(post.id, $any($event.target).checked)">
                    </label>
                    <div class="min-w-0 flex-grow cursor-pointer" (click)="openPostPreview(post)">
                      <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="text-[9px] font-black bg-gray-100 px-2 py-0.5 uppercase tracking-widest">{{ post.authorName }}</span>
                        <span *ngIf="post.jobType" class="text-[9px] font-black bg-blue-50 text-hus-blue px-2 py-0.5 uppercase tracking-widest">{{ post.jobType }}</span>
                        <span class="text-[9px] text-gray-400 uppercase tabular-nums">{{ post.createdAt | date:'dd.MM.yyyy' }}</span>
                      </div>
                      <h3 class="text-lg font-bold text-gray-900 group-hover:text-hus-blue transition-colors">{{ post.title }}</h3>
                      <p class="text-[11px] text-gray-500 line-clamp-2 mt-1">{{ post.summary }}</p>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <span *ngIf="post.location" class="text-[9px] font-bold uppercase tracking-widest text-gray-400">{{ post.location }}</span>
                        <span *ngIf="post.salaryRange" class="text-[9px] font-bold uppercase tracking-widest text-gray-400">{{ post.salaryRange }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-3 flex-shrink-0" *ngIf="can('MODERATION_POSTS_ACTION')">
                    <button type="button" (click)="openPostPreview(post)" class="px-6 py-2 border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:border-hus-blue hover:text-hus-blue transition-all">Xem</button>
                    <button type="button" (click)="approvePost(post.id)" class="px-6 py-2 bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-hus-dark transition-all">Duyệt</button>
                    <button type="button" (click)="rejectPost(post.id)" class="px-6 py-2 bg-white border border-red-200 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Từ chối</button>
                  </div>
                </div>
                <textarea
                  *ngIf="can('MODERATION_POSTS_ACTION')"
                  [(ngModel)]="postRejectComments[post.id]"
                  [ngModelOptions]="{ standalone: true }"
                  rows="2"
                  class="w-full border border-gray-200 px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-hus-blue"
                  placeholder="Lý do từ chối (tùy chọn)">
                </textarea>
              </div>
              <div *ngIf="pendingPosts().length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
                Không có bài đăng nào đang chờ duyệt.
              </div>
            </div>
 
            <div *ngIf="currentTab === 'PAPERS' && can('MODERATION_PAPERS_VIEW')" class="space-y-4">
              <div *ngIf="pendingPapers().length > 0 && can('MODERATION_PAPERS_ACTION')"
                   class="bg-white border border-gray-100 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label class="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-600">
                  <input
                    type="checkbox"
                    class="h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue"
                    [checked]="allPapersSelected"
                    [indeterminate]="somePapersSelected"
                    (change)="toggleAllPapers($any($event.target).checked)">
                  Chọn tất cả ({{ selectedPaperCount }}/{{ pendingPapers().length }})
                </label>
                <button
                  type="button"
                  (click)="approveSelectedPapers()"
                  [disabled]="selectedPaperCount === 0 || isApprovingSelectedPapers"
                  class="px-5 py-2 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {{ isApprovingSelectedPapers ? 'Đang duyệt...' : 'Duyệt đã chọn (' + selectedPaperCount + ')' }}
                </button>
              </div>

              <div *ngFor="let paper of pendingPapers()" class="bg-white border border-gray-100 p-6 space-y-4 group hover:border-hus-blue transition-all">
                <div class="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div class="flex items-start gap-4 flex-grow min-w-0">
                    <label *ngIf="can('MODERATION_PAPERS_ACTION')" class="pt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        class="h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue"
                        [checked]="isPaperSelected(paper.id)"
                        (click)="$event.stopPropagation()"
                        (change)="togglePaperSelection(paper.id, $any($event.target).checked)">
                    </label>
                    <div class="min-w-0 flex-grow cursor-pointer" (click)="openPaperPreview(paper)">
                      <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="text-[9px] font-black bg-blue-50 text-hus-blue px-2 py-0.5 uppercase tracking-widest">{{ paper.authorName }}</span>
                        <span class="text-[9px] text-gray-400 uppercase tabular-nums">{{ paper.category }}</span>
                        <span *ngIf="paper.publicationYear" class="text-[9px] text-gray-400 uppercase tabular-nums">{{ paper.publicationYear }}</span>
                      </div>
                      <h3 class="text-lg font-bold text-gray-900 group-hover:text-hus-blue transition-colors">{{ paper.title }}</h3>
                      <p *ngIf="paper.paperAbstract" class="text-[11px] text-gray-500 line-clamp-2 mt-1" [innerHTML]="paper.paperAbstract"></p>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-3 flex-shrink-0" *ngIf="can('MODERATION_PAPERS_ACTION')">
                    <button type="button" (click)="openPaperPreview(paper)" class="px-6 py-2 border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:border-hus-blue hover:text-hus-blue transition-all">Xem</button>
                    <button type="button" (click)="approvePaper(paper.id)" class="px-6 py-2 bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-hus-dark transition-all">Duyệt</button>
                    <button type="button" (click)="rejectPaper(paper.id)" class="px-6 py-2 bg-white border border-red-200 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Từ chối</button>
                  </div>
                </div>
                <textarea
                  *ngIf="can('MODERATION_PAPERS_ACTION')"
                  [(ngModel)]="paperRejectComments[paper.id]"
                  [ngModelOptions]="{ standalone: true }"
                  rows="2"
                  class="w-full border border-gray-200 px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-hus-blue"
                  placeholder="Lý do từ chối (tùy chọn)">
                </textarea>
              </div>
              <div *ngIf="pendingPapers().length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
                Không có bài nghiên cứu nào đang chờ duyệt.
              </div>
            </div>

        <div *ngIf="currentTab === 'HERO' && can('RESEARCH_HERO_EDIT')" class="bg-white border border-gray-100 p-6 md:p-8 space-y-6">
          <div>
            <h2 class="text-lg font-black text-gray-900 uppercase tracking-widest">Cấu hình Hero Trang Nghiên cứu</h2>
            <p class="mt-2 text-[11px] text-gray-500 font-medium">Cập nhật khẩu hiệu và ảnh đầu trang hiển thị ở /research.</p>
          </div>

          <div *ngIf="heroNotice" class="border border-hus-blue/20 bg-blue-50 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
            {{ heroNotice }}
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Dòng tiêu đề chính</label>
              <input
                [(ngModel)]="heroForm.titlePrefix"
                [ngModelOptions]="{ standalone: true }"
                type="text"
                class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue">
            </div>

            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Dòng tiêu đề nổi bật</label>
              <input
                [(ngModel)]="heroForm.titleHighlight"
                [ngModelOptions]="{ standalone: true }"
                type="text"
                class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue">
            </div>

            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Mô tả</label>
              <textarea
                [(ngModel)]="heroForm.subtitle"
                [ngModelOptions]="{ standalone: true }"
                rows="4"
                class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue">
              </textarea>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">URL ảnh</label>
              <input
                [(ngModel)]="heroForm.imageUrl"
                [ngModelOptions]="{ standalone: true }"
                type="text"
                class="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-hus-blue"
                placeholder="https://...">
            </div>

            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Upload ảnh hero (jpg/png/webp)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                (change)="onHeroImageSelected($event)"
                class="w-full border border-gray-200 px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-hus-blue file:mr-3 file:border-0 file:bg-hus-blue file:px-3 file:py-2 file:text-[10px] file:font-black file:text-white file:uppercase file:tracking-widest hover:file:bg-hus-dark">
            </div>

            <div *ngIf="heroForm.imageUrl" class="pt-2">
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Xem trước ảnh</p>
              <img [src]="heroForm.imageUrl" alt="Research hero preview" class="w-full max-w-3xl h-64 object-cover border border-gray-200">
            </div>
          </div>

          <div>
            <button
              (click)="saveHeroContent()"
              [disabled]="isSavingHero"
              class="px-6 py-3 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-60">
              {{ isSavingHero ? 'Đang lưu...' : 'Lưu cấu hình trang nghiên cứu' }}
            </button>
          </div>
        </div>

        <div *ngIf="currentTab === 'NEWS' && can('RESEARCH_HERO_EDIT')" class="bg-white border border-gray-100 p-6 md:p-8 space-y-6">
          <div>
            <h2 class="text-lg font-black text-gray-900 uppercase tracking-widest">Quản lý Bảng tin khoa</h2>
            <p class="mt-2 text-[11px] text-gray-500 font-medium">Đăng, cập nhật và hiển thị thông báo ở khối "Bảng tin khoa" trang nghiên cứu.</p>
          </div>

          <div *ngIf="newsNotice" class="border border-hus-blue/20 bg-blue-50 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
            {{ newsNotice }}
          </div>

          <div class="grid xl:grid-cols-[380px_1fr] gap-6">
            <div class="border border-gray-100 p-4 space-y-4">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {{ editingNewsId ? 'Cập nhật bản tin' : 'Đăng bản tin mới' }}
              </p>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tiêu đề</label>
                <input
                  [(ngModel)]="newsForm.title"
                  [ngModelOptions]="{ standalone: true }"
                  type="text"
                  maxlength="300"
                  placeholder="Ví dụ: Thông báo lịch seminar..."
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tóm tắt (tùy chọn)</label>
                <textarea
                  [(ngModel)]="newsForm.summary"
                  [ngModelOptions]="{ standalone: true }"
                  rows="3"
                  placeholder="Dòng mô tả ngắn hiển thị ở trang chi tiết"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
                </textarea>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nội dung chi tiết</label>
                <textarea
                  [(ngModel)]="newsForm.content"
                  [ngModelOptions]="{ standalone: true }"
                  rows="8"
                  placeholder="Nội dung thông báo đầy đủ"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
                </textarea>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">URL ảnh (tùy chọn)</label>
                <input
                  [(ngModel)]="newsForm.imageUrl"
                  [ngModelOptions]="{ standalone: true }"
                  type="text"
                  placeholder="https://..."
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Trạng thái</label>
                  <select
                    [(ngModel)]="newsForm.status"
                    [ngModelOptions]="{ standalone: true }"
                    class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-700 focus:outline-none focus:border-hus-blue">
                    <option [ngValue]="'PUBLISHED'">Hiển thị công khai</option>
                    <option [ngValue]="'DRAFT'">Nháp</option>
                  </select>
                </div>

                <div class="flex items-end">
                  <label class="inline-flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest cursor-pointer">
                    <input
                      [(ngModel)]="newsForm.pinned"
                      [ngModelOptions]="{ standalone: true }"
                      type="checkbox"
                      class="h-4 w-4 border-gray-300 text-hus-blue focus:ring-hus-blue">
                    Ghim lên đầu
                  </label>
                </div>
              </div>

              <div class="flex gap-3 pt-2">
                <button
                  (click)="saveNews()"
                  [disabled]="isSavingNews"
                  class="px-5 py-2 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-50">
                  {{ isSavingNews ? 'Đang lưu...' : (editingNewsId ? 'Cập nhật bản tin' : 'Đăng bản tin') }}
                </button>
                <button
                  (click)="startCreateNews()"
                  type="button"
                  class="px-5 py-2 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors">
                  Làm mới
                </button>
              </div>
            </div>

            <div class="border border-gray-100">
              <div *ngIf="newsItems.length === 0"
                   class="py-12 text-center text-[11px] text-gray-400 uppercase tracking-widest">
                Chưa có bản tin khoa nào.
              </div>

              <article *ngFor="let news of newsItems"
                       class="p-4 border-b border-gray-100 space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <span class="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5"
                          [class.bg-blue-50]="news.status === 'PUBLISHED'"
                          [class.text-hus-blue]="news.status === 'PUBLISHED'"
                          [class.bg-gray-100]="news.status === 'DRAFT'"
                          [class.text-gray-500]="news.status === 'DRAFT'">
                      {{ news.status === 'PUBLISHED' ? 'Công khai' : 'Nháp' }}
                    </span>
                    <span *ngIf="news.pinned"
                          class="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-amber-50 text-amber-700">
                      Ghim
                    </span>
                  </div>
                  <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest tabular-nums">
                    {{ news.createdAt | date:'dd.MM.yyyy HH:mm' }}
                  </p>
                </div>

                <h3 class="text-[14px] font-black text-gray-900 leading-snug">
                  {{ news.title }}
                </h3>

                <p class="text-[11px] text-gray-500 line-clamp-2">
                  {{ news.summary || news.content }}
                </p>

                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <a [routerLink]="['/news', news.id]"
                     class="px-3 py-1.5 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-hus-blue hover:text-hus-blue transition-colors">
                    Xem
                  </a>
                  <button
                    (click)="editNews(news)"
                    class="px-3 py-1.5 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-hus-blue hover:text-hus-blue transition-colors">
                    Sửa
                  </button>
                  <button
                    (click)="deleteNews(news.id)"
                    class="px-3 py-1.5 border border-red-200 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                    Xóa
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div *ngIf="currentTab === 'SPECIALIZATIONS' && can('RESEARCH_CATEGORY_MANAGE')" class="bg-white border border-gray-100 p-6 md:p-8 space-y-6">
          <div>
            <h2 class="text-lg font-black text-gray-900 uppercase tracking-widest">Quản lý chuyên ngành dùng chung</h2>
            <p class="mt-2 text-[11px] text-gray-500">Danh mục chuyên ngành dùng chung cho filter hệ thống, hồ sơ sinh viên và bài tuyển dụng.</p>
          </div>

          <div *ngIf="specializationNotice" class="border border-hus-blue/20 bg-blue-50 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
            {{ specializationNotice }}
          </div>

          <div class="grid lg:grid-cols-[360px_1fr] gap-6">
            <div class="border border-gray-100 p-4 space-y-4">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {{ editingSpecializationId ? 'Cập nhật chuyên ngành' : 'Thêm chuyên ngành mới' }}
              </p>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tên chuyên ngành</label>
                <input
                  [(ngModel)]="specializationForm.name"
                  [ngModelOptions]="{ standalone: true }"
                  type="text"
                  maxlength="120"
                  placeholder="Ví dụ: Khoa học dữ liệu"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Thứ tự hiển thị</label>
                <input
                  [(ngModel)]="specializationForm.sortOrder"
                  [ngModelOptions]="{ standalone: true }"
                  type="number"
                  min="0"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Trạng thái</label>
                <select
                  [(ngModel)]="specializationForm.active"
                  [ngModelOptions]="{ standalone: true }"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-700 focus:outline-none focus:border-hus-blue">
                  <option [ngValue]="true">Đang hoạt động</option>
                  <option [ngValue]="false">Tạm ẩn</option>
                </select>
              </div>

              <div class="flex gap-3 pt-2">
                <button
                  (click)="saveSpecialization()"
                  [disabled]="isSavingSpecialization"
                  class="px-5 py-2 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-50">
                  {{ isSavingSpecialization ? 'Đang lưu...' : (editingSpecializationId ? 'Cập nhật' : 'Thêm chuyên ngành') }}
                </button>
                <button
                  (click)="startCreateSpecialization()"
                  type="button"
                  class="px-5 py-2 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors">
                  Làm mới
                </button>
              </div>
            </div>

            <div class="border border-gray-100">
              <div *ngIf="specializations.length === 0"
                   class="py-12 text-center text-[11px] text-gray-400 uppercase tracking-widest">
                Chưa có chuyên ngành dùng chung.
              </div>

              <div *ngFor="let specialization of specializations"
                   class="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-[12px] font-black uppercase tracking-tight text-gray-900">{{ specialization.name }}</p>
                    <span class="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5"
                          [class.bg-blue-50]="specialization.active"
                          [class.text-hus-blue]="specialization.active"
                          [class.bg-gray-100]="!specialization.active"
                          [class.text-gray-500]="!specialization.active">
                      {{ specialization.active ? 'ACTIVE' : 'INACTIVE' }}
                    </span>
                  </div>
                  <p class="mt-1 text-[10px] text-gray-400 uppercase tracking-widest">Sort: {{ specialization.sortOrder }}</p>
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="editSpecialization(specialization)"
                    class="px-4 py-2 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors">
                    Sửa
                  </button>
                  <button
                    (click)="deactivateSpecialization(specialization.id)"
                    [disabled]="!specialization.active"
                    class="px-4 py-2 border border-red-200 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Ẩn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="currentTab === 'PAPER_CATEGORIES' && can('RESEARCH_CATEGORY_MANAGE')" class="bg-white border border-gray-100 p-6 md:p-8 space-y-6">
          <div>
            <h2 class="text-lg font-black text-gray-900 uppercase tracking-widest">Quản lý phân loại bài nghiên cứu</h2>
            <p class="mt-2 text-[11px] text-gray-500">Danh mục này dùng khi user soạn thảo bài nghiên cứu và ở phần filter trang nghiên cứu.</p>
          </div>

          <div *ngIf="paperCategoryNotice" class="border border-hus-blue/20 bg-blue-50 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
            {{ paperCategoryNotice }}
          </div>

          <div class="grid lg:grid-cols-[360px_1fr] gap-6">
            <div class="border border-gray-100 p-4 space-y-4">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {{ editingPaperCategoryId ? 'Cập nhật phân loại' : 'Thêm phân loại mới' }}
              </p>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tên phân loại</label>
                <input
                  [(ngModel)]="paperCategoryForm.name"
                  [ngModelOptions]="{ standalone: true }"
                  type="text"
                  maxlength="120"
                  placeholder="Ví dụ: Trí tuệ nhân tạo"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Thứ tự hiển thị</label>
                <input
                  [(ngModel)]="paperCategoryForm.sortOrder"
                  [ngModelOptions]="{ standalone: true }"
                  type="number"
                  min="0"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Trạng thái</label>
                <select
                  [(ngModel)]="paperCategoryForm.active"
                  [ngModelOptions]="{ standalone: true }"
                  class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-700 focus:outline-none focus:border-hus-blue">
                  <option [ngValue]="true">Đang hoạt động</option>
                  <option [ngValue]="false">Tạm ẩn</option>
                </select>
              </div>

              <div class="flex gap-3 pt-2">
                <button
                  (click)="savePaperCategory()"
                  [disabled]="isSavingPaperCategory"
                  class="px-5 py-2 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-50">
                  {{ isSavingPaperCategory ? 'Đang lưu...' : (editingPaperCategoryId ? 'Cập nhật' : 'Thêm phân loại') }}
                </button>
                <button
                  (click)="startCreatePaperCategory()"
                  type="button"
                  class="px-5 py-2 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors">
                  Làm mới
                </button>
              </div>
            </div>

            <div class="border border-gray-100">
              <div *ngIf="researchCategories.length === 0"
                   class="py-12 text-center text-[11px] text-gray-400 uppercase tracking-widest">
                Chưa có phân loại bài nghiên cứu.
              </div>

              <div *ngFor="let category of researchCategories"
                   class="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-[12px] font-black uppercase tracking-tight text-gray-900">{{ category.name }}</p>
                    <span class="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5"
                          [class.bg-blue-50]="category.active"
                          [class.text-hus-blue]="category.active"
                          [class.bg-gray-100]="!category.active"
                          [class.text-gray-500]="!category.active">
                      {{ category.active ? 'ACTIVE' : 'INACTIVE' }}
                    </span>
                  </div>
                  <p class="mt-1 text-[10px] text-gray-400 uppercase tracking-widest">Sort: {{ category.sortOrder }}</p>
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="editPaperCategory(category)"
                    class="px-4 py-2 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors">
                    Sửa
                  </button>
                  <button
                    (click)="deactivatePaperCategory(category.id)"
                    [disabled]="!category.active"
                    class="px-4 py-2 border border-red-200 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Ẩn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="currentTab === 'RBAC' && can('RBAC_MANAGE')" class="bg-white border border-gray-100 p-6 md:p-8 space-y-6">
          <div>
            <h2 class="text-lg font-black text-gray-900 uppercase tracking-widest">Phân quyền tài khoản thấp hơn</h2>
            <p class="mt-2 text-[11px] text-gray-500">Mặc định user sẽ theo vai trò gốc (không tự có quyền admin). Chỉ khi bạn cấp thêm thì user mới có quyền nâng cao.</p>
          </div>

          <div *ngIf="rbacNotice" class="border border-hus-blue/20 bg-blue-50 text-hus-blue text-[10px] font-bold uppercase tracking-widest px-4 py-3">
            {{ rbacNotice }}
          </div>

          <div *ngIf="rbacUsers.length === 0" class="text-[11px] text-gray-400 uppercase tracking-widest py-6 text-center border border-dashed border-gray-200">
            Không có user khả dụng để phân quyền.
          </div>

          <div *ngIf="rbacUsers.length > 0 && rbacPermissions.length > 0" class="grid lg:grid-cols-[320px_1fr] gap-6">
            <div class="space-y-3">
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tìm kiếm user</label>
              <input
                [(ngModel)]="rbacUserSearch"
                [ngModelOptions]="{ standalone: true }"
                type="text"
                placeholder="Nhập tên hoặc email..."
                class="w-full border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:border-hus-blue">

              <div class="border border-gray-100 max-h-[560px] overflow-y-auto">
                <button
                  *ngFor="let user of filteredRbacUsers"
                  (click)="selectRbacUser(user.userId)"
                  [class.bg-blue-50]="selectedRbacUserId === user.userId"
                  [class.border-hus-blue]="selectedRbacUserId === user.userId"
                  class="w-full text-left border-b border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                  <p class="text-[11px] font-black uppercase tracking-tight text-gray-900">{{ user.displayName }}</p>
                  <p class="text-[10px] text-gray-500">{{ user.email }}</p>
                  <p class="mt-1 text-[9px] text-gray-400 uppercase tracking-widest">Role: {{ primaryRole(user.roles) || 'N/A' }}</p>
                </button>

                <div *ngIf="filteredRbacUsers.length === 0" class="p-6 text-center text-[10px] text-gray-400 uppercase tracking-widest">
                  Không tìm thấy user phù hợp.
                </div>
              </div>
            </div>

            <div *ngIf="selectedRbacUser as selected; else chooseUserHint" class="space-y-5">
              <div class="border border-gray-100 bg-gray-50 p-4">
                <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Đang chỉnh quyền</p>
                <p class="mt-1 text-sm font-black text-gray-900 uppercase tracking-tight">{{ selected.displayName }}</p>
                <p class="text-[11px] text-gray-500">{{ selected.email }}</p>
                <p class="mt-2 text-[10px] text-gray-500">Vai trò hiện tại: <span class="font-bold uppercase">{{ primaryRole(selected.roles) || 'N/A' }}</span></p>
              </div>

              <div class="border border-gray-100 p-4 space-y-3">
                <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Quyền nâng cao đã cấp riêng</p>

                <div *ngIf="selectedGrantedPermissions.length === 0"
                     class="text-[10px] text-gray-400 uppercase tracking-widest border border-dashed border-gray-200 px-3 py-4 text-center">
                  Chưa cấp quyền nâng cao nào.
                </div>

                <div *ngIf="selectedGrantedPermissions.length > 0" class="flex flex-wrap gap-2">
                  <div *ngFor="let permission of selectedGrantedPermissions"
                       class="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 px-3 py-2">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-hus-blue">
                      {{ permissionLabel(permission.name) }}
                    </span>
                    <button
                      (click)="removeGrantedPermission(permission.name)"
                      class="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-600">
                      Gỡ
                    </button>
                  </div>
                </div>
              </div>

              <div class="border border-gray-100 p-4 space-y-3">
                <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cấp thêm quyền nâng cao</p>
                <div class="flex flex-col sm:flex-row gap-3">
                  <select
                    [(ngModel)]="permissionToAdd"
                    [ngModelOptions]="{ standalone: true }"
                    class="flex-1 border border-gray-200 px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-hus-blue">
                    <option value="">Chọn quyền cần cấp...</option>
                    <option *ngFor="let permission of selectedGrantablePermissions" [value]="permission.name">
                      {{ permissionLabel(permission.name) }}
                    </option>
                  </select>
                  <button
                    (click)="addPermissionToSelectedUser()"
                    [disabled]="!permissionToAdd"
                    class="px-5 py-2 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-50">
                    Thêm quyền
                  </button>
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  (click)="saveSelectedUserRbac()"
                  [disabled]="!selectedRbacUserId || savingRbacUser[selected.userId]"
                  class="px-6 py-3 bg-hus-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-hus-dark transition-colors disabled:opacity-50">
                  {{ savingRbacUser[selected.userId] ? 'Đang lưu...' : 'Lưu phân quyền' }}
                </button>
              </div>
            </div>

            <ng-template #chooseUserHint>
              <div class="border-2 border-dashed border-gray-200 text-center py-20 text-[11px] uppercase tracking-widest text-gray-400">
                Chọn một user ở danh sách bên trái để bắt đầu phân quyền.
              </div>
            </ng-template>
          </div>
        </div>

        <app-post-detail *ngIf="previewPost() as post"
                         [post]="toModerationPreviewPost(post)"
                         [showActions]="false"
                         (close)="closeModerationPreview()">
        </app-post-detail>

        <div *ngIf="previewPaper()" class="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" (click)="closeModerationPreview()"></div>

          <div class="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-white shadow-2xl border border-gray-100">
            <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-hus-blue">
                  {{ previewPost() ? 'Xem trước tin tuyển dụng chờ duyệt' : 'Xem trước bài nghiên cứu chờ duyệt' }}
                </p>
                <h3 class="mt-2 text-lg sm:text-xl font-black text-gray-900 tracking-tight">Chế độ xem bài nghiên cứu chi tiết</h3>
              </div>
              <button type="button"
                      (click)="closeModerationPreview()"
                      class="w-10 h-10 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors flex-shrink-0">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div *ngIf="previewPaper() as paper" class="bg-white">
              <div class="border-b border-gray-100 bg-blue-50/50 py-3 px-5 sm:px-6 lg:px-8">
                <div class="max-w-4xl mx-auto flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span class="text-hus-blue">Bài nghiên cứu chờ duyệt</span>
                  <span class="text-gray-300">/</span>
                  <span class="text-hus-blue opacity-70">{{ formatModerationValue(paper.researchArea) }}</span>
                </div>
              </div>

              <div class="px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
                <div class="max-w-4xl mx-auto">
                  <header class="mb-8 sm:mb-12 border-b-2 border-hus-blue pb-8 sm:pb-10">
                    <div class="flex items-center gap-3 mb-6 text-[11px] font-bold uppercase tracking-tighter">
                      <span class="bg-hus-blue text-white px-3 py-1">{{ moderationResearchCategoryLabel(paper.category) }}</span>
                      <span class="text-gray-300">|</span>
                      <span class="text-hus-blue">{{ paper.publicationYear || 'N/A' }}</span>
                      <a *ngIf="hasModerationPaperPdf(paper.pdfUrl)"
                         [href]="moderationPaperPdfUrl(paper.pdfUrl)"
                         target="_blank"
                         rel="noopener noreferrer"
                         class="ml-auto inline-flex items-center justify-center border border-gray-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-hus-blue hover:text-hus-blue transition-colors">
                        Mở PDF
                      </a>
                    </div>

                    <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-6 sm:mb-8">
                      {{ paper.title }}
                    </h1>

                    <div class="flex flex-col gap-6">
                      <div class="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>Lĩnh vực: <span class="text-hus-blue">{{ formatModerationValue(paper.researchArea) }}</span></span>
                        <span>Hội thảo / Tạp chí: <span class="text-gray-600">{{ formatModerationValue(paper.journalConference, 'MIM Draft') }}</span></span>
                        <span>Cập nhật: <span class="text-gray-600">{{ (paper.updatedAt || paper.createdAt) | date:'dd.MM.yyyy HH:mm' }}</span></span>
                      </div>

                      <div class="flex flex-wrap gap-4 items-center">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tác giả biên soạn:</span>
                        <div class="flex flex-wrap gap-x-6 gap-y-2">
                          <div *ngFor="let author of moderationPaperAuthors(paper)" class="text-sm font-bold text-gray-900">
                            <a *ngIf="author.authorId"
                               [routerLink]="['/profile', author.authorId]"
                               class="transition-colors hover:text-hus-blue">
                              {{ author.name }}
                            </a>
                            <span *ngIf="!author.authorId">{{ author.name }}</span>
                            <span *ngIf="isMainModerationAuthor(author)" class="ml-1 text-[9px] text-hus-blue uppercase tracking-tighter font-black">(Chủ biên)</span>
                          </div>
                          <div *ngIf="moderationPaperAuthors(paper).length === 0" class="text-sm font-bold text-gray-400">
                            {{ paper.authorName }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </header>

                  <div class="space-y-10 sm:space-y-14">
                    <section>
                      <h2 class="text-[11px] font-bold text-hus-blue uppercase tracking-[0.2em] mb-6 inline-block border-b-4 border-hus-blue pb-1">
                        Tóm tắt nghiên cứu
                      </h2>
                      <div class="research-rich-content max-w-full"
                           [innerHTML]="paper.paperAbstract || 'Chưa có tóm tắt nghiên cứu.'"></div>
                    </section>

                    <section>
                      <div class="flex justify-between items-baseline mb-6">
                        <h2 class="text-[11px] font-bold text-hus-blue uppercase tracking-[0.2em] inline-block border-b-4 border-hus-blue pb-1">
                          Văn bản chi tiết (PDF)
                        </h2>
                      </div>

                      <div class="w-full aspect-[1/1.55] min-h-[560px] md:min-h-[720px] bg-gray-50 border-2 border-hus-blue/10">
                        <app-pdf-canvas-viewer *ngIf="hasModerationPaperPdf(paper.pdfUrl); else missingInlineModerationPdf"
                                               [src]="moderationPaperPdfUrl(paper.pdfUrl)"
                                               [title]="paper.title"
                                               class="block w-full h-full">
                        </app-pdf-canvas-viewer>
                        <ng-template #missingInlineModerationPdf>
                          <div class="w-full h-full flex flex-col items-center justify-center text-center px-6">
                            <p class="text-sm font-bold uppercase tracking-widest text-gray-400">
                              Không có file PDF.
                            </p>
                            <p class="mt-2 text-xs text-gray-500 max-w-md">
                              Bài nghiên cứu này chưa được đính kèm file PDF.
                            </p>
                          </div>
                        </ng-template>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly moderationService = inject(AdminModerationService);
    private readonly contentService = inject(ContentService);
    private readonly adminContentService = inject(AdminContentService);
    private readonly adminNewsService = inject(AdminNewsService);
    private readonly adminRbacService = inject(AdminRbacService);
    private readonly adminResearchCategoryService = inject(AdminResearchCategoryService);
    private readonly adminSpecializationService = inject(AdminSpecializationService);

    currentTab: AdminTabKey = 'POSTS';
    readonly adminTabs: AdminTabConfig[] = [
        {
            key: 'POSTS',
            label: 'Tin tuyển dụng',
            helper: 'Duyệt nội dung tuyển dụng',
            permission: 'MODERATION_POSTS_VIEW'
        },
        {
            key: 'PAPERS',
            label: 'Bài báo khoa học',
            helper: 'Duyệt bài nghiên cứu',
            permission: 'MODERATION_PAPERS_VIEW'
        },
        {
            key: 'HERO',
            label: 'Trang nghiên cứu',
            helper: 'Chỉnh hero trang research',
            permission: 'RESEARCH_HERO_EDIT'
        },
        {
            key: 'NEWS',
            label: 'Bảng tin khoa',
            helper: 'Đăng thông báo cho trang research',
            permission: 'RESEARCH_HERO_EDIT'
        },
        {
            key: 'SPECIALIZATIONS',
            label: 'Chuyên ngành chung',
            helper: 'Quản lý chuyên ngành hệ thống',
            permission: 'RESEARCH_CATEGORY_MANAGE'
        },
        {
            key: 'PAPER_CATEGORIES',
            label: 'Phân loại bài viết',
            helper: 'Danh mục research categories',
            permission: 'RESEARCH_CATEGORY_MANAGE'
        },
        {
            key: 'RBAC',
            label: 'Phân quyền',
            helper: 'Cấp quyền thao tác nâng cao',
            permission: 'RBAC_MANAGE'
        }
    ];

    pendingPosts: WritableSignal<ModerationPostItem[]> = signal([]);
    pendingPapers: WritableSignal<ModerationPaperItem[]> = signal([]);
    selectedPostIds: WritableSignal<string[]> = signal([]);
    selectedPaperIds: WritableSignal<string[]> = signal([]);
    previewPost: WritableSignal<ModerationPostItem | null> = signal(null);
    previewPaper: WritableSignal<ModerationPaperItem | null> = signal(null);
    private lastNotifId = '';

    postRejectComments: Record<string, string> = {};
    paperRejectComments: Record<string, string> = {};
    isApprovingSelectedPosts = false;
    isApprovingSelectedPapers = false;

    heroForm = {
        titlePrefix: '',
        titleHighlight: '',
        subtitle: '',
        imageUrl: ''
    };
    isSavingHero = false;
    newsItems: NewsItem[] = [];
    newsForm: {
        title: string;
        summary: string;
        content: string;
        imageUrl: string;
        status: NewsStatus;
        pinned: boolean;
    } = {
            title: '',
            summary: '',
            content: '',
            imageUrl: '',
            status: 'PUBLISHED',
            pinned: false
        };
    editingNewsId: string | null = null;
    isSavingNews = false;
    newsNotice = '';

    rbacPermissions: RbacPermissionDefinition[] = [];
    rbacRoleMatrix: RbacRolePermission[] = [];
    rbacRolePriority: Record<string, number> = {};
    rbacUsers: RbacUserAssignment[] = [];
    rbacOverrideDrafts: Record<string, Record<string, PermissionOverrideDraftEffect>> = {};
    savingRbacUser: Record<string, boolean> = {};
    rbacUserSearch = '';
    selectedRbacUserId: string | null = null;
    permissionToAdd = '';

    specializations: ResearchCategory[] = [];
    specializationForm = {
        name: '',
        sortOrder: 0,
        active: true
    };
    editingSpecializationId: string | null = null;
    isSavingSpecialization = false;
    specializationNotice = '';

    researchCategories: ResearchCategory[] = [];
    paperCategoryForm = {
        name: '',
        sortOrder: 0,
        active: true
    };
    editingPaperCategoryId: string | null = null;
    isSavingPaperCategory = false;
    paperCategoryNotice = '';

    heroNotice = '';
    rbacNotice = '';
    moderationNotice = '';
    errorMessage = '';
    private pollSubscription?: Subscription;
    private routeQuerySubscription?: Subscription;

    // Notification signal bindings
    readonly notifications = adminNotificationSignal.notifications;

    constructor() {
        effect(() => {
            const notifs = this.notifications();
            if (notifs.length > 0) {
                const latest = notifs[0];
                if (latest.id !== this.lastNotifId) {
                    this.lastNotifId = latest.id;
                    this.loadPendingModeration();
                }
            }
        });
    }

    ngOnInit(): void {
        this.currentTab = this.resolveInitialTab();

        this.routeQuerySubscription = this.route.queryParamMap.subscribe((params) => {
            const requestedTab = params.get('tab');
            const resolvedTab = this.resolveTabFromQuery(requestedTab);
            if (resolvedTab) {
                this.currentTab = resolvedTab;
                this.errorMessage = '';
            } else if (!this.hasAnyTabAccess()) {
                this.currentTab = 'POSTS';
            } else if (!this.can(this.currentTabPermission())) {
                this.currentTab = this.resolveInitialTab();
            }
        });
        this.loadPendingModeration();
        this.loadHeroContent();
        this.loadNews();
        this.loadSpecializations();
        this.loadResearchCategories();
        this.loadRbacData();
        // Poll immediately and then every 10s to auto-refresh pending moderation without reload.
        // Using timer(0, ...) ensures it runs immediately on init.
        this.pollSubscription = timer(0, 10_000).subscribe(() => {
            this.loadPendingModeration();
        });
    }

    ngOnDestroy(): void {
        this.pollSubscription?.unsubscribe();
        this.routeQuerySubscription?.unsubscribe();
    }

    can(permission: string): boolean {
        return authSignal.hasPermission(permission);
    }

    get currentTabConfig(): AdminTabConfig | null {
        return this.adminTabs.find((tab) => tab.key === this.currentTab) ?? null;
    }

    get totalPendingCount(): number {
        return this.pendingPosts().length + this.pendingPapers().length;
    }

    get visibleTabs(): AdminTabConfig[] {
        return this.adminTabs.filter((tab) => this.can(tab.permission));
    }

    get selectedPostCount(): number {
        return this.selectedPostIds().length;
    }

    get selectedPaperCount(): number {
        return this.selectedPaperIds().length;
    }

    get allPostsSelected(): boolean {
        const posts = this.pendingPosts();
        return posts.length > 0 && posts.every((post) => this.selectedPostIds().includes(post.id));
    }

    get somePostsSelected(): boolean {
        return this.selectedPostCount > 0 && !this.allPostsSelected;
    }

    get allPapersSelected(): boolean {
        const papers = this.pendingPapers();
        return papers.length > 0 && papers.every((paper) => this.selectedPaperIds().includes(paper.id));
    }

    get somePapersSelected(): boolean {
        return this.selectedPaperCount > 0 && !this.allPapersSelected;
    }

    hasAnyTabAccess(): boolean {
        return this.visibleTabs.length > 0;
    }

    selectTab(tab: AdminTabKey): void {
        this.currentTab = tab;
        this.errorMessage = '';
        this.moderationNotice = '';
        this.closeModerationPreview();
    }

    tabBadge(tab: AdminTabKey): number | null {
        if (tab === 'POSTS') {
            return this.pendingPosts().length;
        }
        if (tab === 'PAPERS') {
            return this.pendingPapers().length;
        }
        return null;
    }

    isPostSelected(id: string): boolean {
        return this.selectedPostIds().includes(id);
    }

    isPaperSelected(id: string): boolean {
        return this.selectedPaperIds().includes(id);
    }

    togglePostSelection(id: string, checked: boolean): void {
        this.selectedPostIds.update((prev) => checked
            ? [...new Set([...prev, id])]
            : prev.filter((item) => item !== id));
    }

    togglePaperSelection(id: string, checked: boolean): void {
        this.selectedPaperIds.update((prev) => checked
            ? [...new Set([...prev, id])]
            : prev.filter((item) => item !== id));
    }

    toggleAllPosts(checked: boolean): void {
        this.selectedPostIds.set(checked ? this.pendingPosts().map((post) => post.id) : []);
    }

    toggleAllPapers(checked: boolean): void {
        this.selectedPaperIds.set(checked ? this.pendingPapers().map((paper) => paper.id) : []);
    }

    openPostPreview(post: ModerationPostItem): void {
        this.previewPaper.set(null);
        this.previewPost.set(post);
    }

    openPaperPreview(paper: ModerationPaperItem): void {
        this.previewPost.set(null);
        this.previewPaper.set(paper);
    }

    closeModerationPreview(): void {
        this.previewPost.set(null);
        this.previewPaper.set(null);
    }

    approveSelectedPosts(): void {
        const ids = this.selectedPostIds();
        if (ids.length === 0 || this.isApprovingSelectedPosts) {
            return;
        }

        this.errorMessage = '';
        this.moderationNotice = '';
        this.isApprovingSelectedPosts = true;

        forkJoin(ids.map((id) => this.moderationService.approvePost(id).pipe(take(1))))
            .pipe(finalize(() => {
                this.isApprovingSelectedPosts = false;
            }))
            .subscribe((results) => {
                const approvedIds = ids.filter((id, index) => results[index]);
                const failedCount = ids.length - approvedIds.length;

                if (approvedIds.length > 0) {
                    this.removePostsFromQueue(approvedIds);
                    this.moderationNotice = `Đã duyệt ${approvedIds.length} bài tuyển dụng.`;
                }

                if (failedCount > 0) {
                    this.errorMessage = `Có ${failedCount} bài tuyển dụng đã bị xóa hoặc không còn ở trạng thái chờ duyệt.`;
                    this.loadPendingModeration();
                }
            });
    }

    approveSelectedPapers(): void {
        const ids = this.selectedPaperIds();
        if (ids.length === 0 || this.isApprovingSelectedPapers) {
            return;
        }

        this.errorMessage = '';
        this.moderationNotice = '';
        this.isApprovingSelectedPapers = true;

        forkJoin(ids.map((id) => this.moderationService.approvePaper(id).pipe(take(1))))
            .pipe(finalize(() => {
                this.isApprovingSelectedPapers = false;
            }))
            .subscribe((results) => {
                const approvedIds = ids.filter((id, index) => results[index]);
                const failedCount = ids.length - approvedIds.length;

                if (approvedIds.length > 0) {
                    this.removePapersFromQueue(approvedIds);
                    this.moderationNotice = `Đã duyệt ${approvedIds.length} bài nghiên cứu.`;
                }

                if (failedCount > 0) {
                    this.errorMessage = `Có ${failedCount} bài nghiên cứu đã bị xóa hoặc không còn ở trạng thái chờ duyệt.`;
                    this.loadPendingModeration();
                }
            });
    }

    approvePost(id: string): void {
        this.errorMessage = '';
        this.moderationNotice = '';
        this.moderationService.approvePost(id).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Bài tuyển dụng đã bị xóa hoặc không còn ở trạng thái chờ duyệt.';
                this.loadPendingModeration();
                return;
            }
            this.removePostsFromQueue([id]);
            this.moderationNotice = 'Đã duyệt bài tuyển dụng.';
        });
    }

    rejectPost(id: string): void {
        this.errorMessage = '';
        this.moderationNotice = '';
        const comment = this.postRejectComments[id] ?? '';
        this.moderationService.rejectPost(id, comment).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Bài tuyển dụng đã bị xóa hoặc không còn ở trạng thái chờ duyệt.';
                this.loadPendingModeration();
                return;
            }
            this.removePostsFromQueue([id]);
            this.moderationNotice = 'Đã từ chối bài tuyển dụng.';
        });
    }

    approvePaper(id: string): void {
        this.errorMessage = '';
        this.moderationNotice = '';
        this.moderationService.approvePaper(id).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Bài nghiên cứu đã bị xóa hoặc không còn ở trạng thái chờ duyệt.';
                this.loadPendingModeration();
                return;
            }
            this.removePapersFromQueue([id]);
            this.moderationNotice = 'Đã duyệt bài nghiên cứu.';
        });
    }

    rejectPaper(id: string): void {
        this.errorMessage = '';
        this.moderationNotice = '';
        const comment = this.paperRejectComments[id] ?? '';
        this.moderationService.rejectPaper(id, comment).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Bài nghiên cứu đã bị xóa hoặc không còn ở trạng thái chờ duyệt.';
                this.loadPendingModeration();
                return;
            }
            this.removePapersFromQueue([id]);
            this.moderationNotice = 'Đã từ chối bài nghiên cứu.';
        });
    }

    onHeroImageSelected(event: Event): void {
        this.errorMessage = '';
        this.heroNotice = '';

        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        this.adminContentService.uploadResearchHeroImage(file).subscribe({
            next: (imageUrl) => {
                this.heroForm.imageUrl = imageUrl;
                this.heroNotice = 'Đã tải ảnh hero lên thành công.';
            },
            error: () => {
                this.errorMessage = 'Không thể tải ảnh hero lên.';
            }
        });
    }

    saveHeroContent(): void {
        const payload = {
            titlePrefix: this.heroForm.titlePrefix.trim(),
            titleHighlight: this.heroForm.titleHighlight.trim(),
            subtitle: this.heroForm.subtitle.trim(),
            imageUrl: this.heroForm.imageUrl.trim()
        };

        if (!payload.titlePrefix || !payload.titleHighlight || !payload.subtitle || !payload.imageUrl) {
            this.errorMessage = 'Vui lòng nhập đầy đủ nội dung hero.';
            return;
        }

        this.errorMessage = '';
        this.heroNotice = '';
        this.isSavingHero = true;

        this.adminContentService.updateResearchHeroContent(payload).subscribe((saved) => {
            this.isSavingHero = false;
            if (!saved) {
                this.errorMessage = 'Không thể lưu cấu hình trang nghiên cứu.';
                return;
            }

            this.heroForm = {
                titlePrefix: saved.titlePrefix,
                titleHighlight: saved.titleHighlight,
                subtitle: saved.subtitle,
                imageUrl: saved.imageUrl
            };
            this.heroNotice = 'Đã cập nhật hero trang nghiên cứu.';
        });
    }

    startCreateNews(): void {
        this.editingNewsId = null;
        this.newsForm = {
            title: '',
            summary: '',
            content: '',
            imageUrl: '',
            status: 'PUBLISHED',
            pinned: false
        };
        this.errorMessage = '';
        this.newsNotice = '';
    }

    editNews(news: NewsItem): void {
        this.editingNewsId = news.id;
        this.newsForm = {
            title: news.title,
            summary: news.summary ?? '',
            content: news.content,
            imageUrl: news.imageUrl ?? '',
            status: news.status,
            pinned: news.pinned
        };
        this.errorMessage = '';
        this.newsNotice = '';
    }

    saveNews(): void {
        const payload = {
            title: this.newsForm.title.trim(),
            summary: this.newsForm.summary.trim(),
            content: this.newsForm.content.trim(),
            imageUrl: this.newsForm.imageUrl.trim(),
            status: this.newsForm.status,
            pinned: this.newsForm.pinned
        };

        if (!payload.title) {
            this.errorMessage = 'Vui lòng nhập tiêu đề bản tin.';
            return;
        }
        if (!payload.content) {
            this.errorMessage = 'Vui lòng nhập nội dung bản tin.';
            return;
        }

        this.errorMessage = '';
        this.newsNotice = '';
        this.isSavingNews = true;

        const request$ = this.editingNewsId
            ? this.adminNewsService.update(this.editingNewsId, payload)
            : this.adminNewsService.create(payload);

        request$.pipe(
            finalize(() => {
                this.isSavingNews = false;
            })
        ).subscribe((saved) => {
            if (!saved) {
                this.errorMessage = this.editingNewsId
                    ? 'Không thể cập nhật bản tin.'
                    : 'Không thể tạo bản tin.';
                return;
            }

            const notice = this.editingNewsId
                ? 'Đã cập nhật bản tin.'
                : 'Đã đăng bản tin mới.';
            this.startCreateNews();
            this.newsNotice = notice;
            this.loadNews();
        });
    }

    deleteNews(newsId: string): void {
        if (!confirm('Bạn có chắc muốn xóa bản tin này?')) {
            return;
        }

        this.errorMessage = '';
        this.newsNotice = '';
        this.adminNewsService.delete(newsId).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Không thể xóa bản tin đã chọn.';
                return;
            }
            if (this.editingNewsId === newsId) {
                this.startCreateNews();
            }
            this.newsNotice = 'Đã xóa bản tin.';
            this.loadNews();
        });
    }

    startCreateSpecialization(): void {
        this.editingSpecializationId = null;
        this.specializationForm = {
            name: '',
            sortOrder: 0,
            active: true
        };
        this.errorMessage = '';
        this.specializationNotice = '';
    }

    editSpecialization(specialization: ResearchCategory): void {
        this.editingSpecializationId = specialization.id;
        this.specializationForm = {
            name: specialization.name,
            sortOrder: specialization.sortOrder,
            active: specialization.active
        };
        this.errorMessage = '';
        this.specializationNotice = '';
    }

    saveSpecialization(): void {
        const payload = {
            name: this.specializationForm.name.trim(),
            sortOrder: Number(this.specializationForm.sortOrder),
            active: this.specializationForm.active
        };

        if (!payload.name) {
            this.errorMessage = 'Vui lòng nhập tên chuyên ngành.';
            return;
        }
        if (!Number.isFinite(payload.sortOrder) || payload.sortOrder < 0) {
            this.errorMessage = 'Thứ tự hiển thị phải là số không âm.';
            return;
        }

        this.errorMessage = '';
        this.specializationNotice = '';
        this.isSavingSpecialization = true;

        const request$ = this.editingSpecializationId
            ? this.adminSpecializationService.update(this.editingSpecializationId, payload)
            : this.adminSpecializationService.create(payload);

        request$.pipe(
            finalize(() => {
                this.isSavingSpecialization = false;
            })
        ).subscribe((saved) => {
            if (!saved) {
                this.errorMessage = this.editingSpecializationId
                    ? 'Không thể cập nhật chuyên ngành.'
                    : 'Không thể tạo chuyên ngành.';
                return;
            }

            const notice = this.editingSpecializationId
                ? 'Đã cập nhật chuyên ngành.'
                : 'Đã thêm chuyên ngành mới.';
            this.startCreateSpecialization();
            this.specializationNotice = notice;
            this.loadSpecializations();
        });
    }

    deactivateSpecialization(specializationId: string): void {
        this.errorMessage = '';
        this.specializationNotice = '';

        this.adminSpecializationService.deactivate(specializationId).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Không thể ẩn chuyên ngành đã chọn.';
                return;
            }
            this.specializationNotice = 'Đã ẩn chuyên ngành.';
            this.loadSpecializations();
        });
    }

    startCreatePaperCategory(): void {
        this.editingPaperCategoryId = null;
        this.paperCategoryForm = {
            name: '',
            sortOrder: 0,
            active: true
        };
        this.errorMessage = '';
        this.paperCategoryNotice = '';
    }

    editPaperCategory(category: ResearchCategory): void {
        this.editingPaperCategoryId = category.id;
        this.paperCategoryForm = {
            name: category.name,
            sortOrder: category.sortOrder,
            active: category.active
        };
        this.errorMessage = '';
        this.paperCategoryNotice = '';
    }

    savePaperCategory(): void {
        const payload = {
            name: this.paperCategoryForm.name.trim(),
            sortOrder: Number(this.paperCategoryForm.sortOrder),
            active: this.paperCategoryForm.active
        };

        if (!payload.name) {
            this.errorMessage = 'Vui lòng nhập tên phân loại bài nghiên cứu.';
            return;
        }
        if (!Number.isFinite(payload.sortOrder) || payload.sortOrder < 0) {
            this.errorMessage = 'Thứ tự hiển thị phải là số không âm.';
            return;
        }

        this.errorMessage = '';
        this.paperCategoryNotice = '';
        this.isSavingPaperCategory = true;

        const request$ = this.editingPaperCategoryId
            ? this.adminResearchCategoryService.update(this.editingPaperCategoryId, payload)
            : this.adminResearchCategoryService.create(payload);

        request$.pipe(
            finalize(() => {
                this.isSavingPaperCategory = false;
            })
        ).subscribe((saved) => {
            if (!saved) {
                this.errorMessage = this.editingPaperCategoryId
                    ? 'Không thể cập nhật phân loại bài nghiên cứu.'
                    : 'Không thể tạo phân loại bài nghiên cứu.';
                return;
            }

            const notice = this.editingPaperCategoryId
                ? 'Đã cập nhật phân loại bài nghiên cứu.'
                : 'Đã thêm phân loại bài nghiên cứu mới.';
            this.startCreatePaperCategory();
            this.paperCategoryNotice = notice;
            this.loadResearchCategories();
        });
    }

    deactivatePaperCategory(categoryId: string): void {
        this.errorMessage = '';
        this.paperCategoryNotice = '';

        this.adminResearchCategoryService.deactivate(categoryId).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Không thể ẩn phân loại bài nghiên cứu đã chọn.';
                return;
            }
            this.paperCategoryNotice = 'Đã ẩn phân loại bài nghiên cứu.';
            this.loadResearchCategories();
        });
    }

    getDraftEffect(userId: string, permissionName: string): PermissionOverrideDraftEffect {
        return this.rbacOverrideDrafts[userId]?.[permissionName] ?? 'INHERIT';
    }

    setDraftEffect(userId: string, permissionName: string, value: PermissionOverrideDraftEffect): void {
        if (!this.rbacOverrideDrafts[userId]) {
            this.rbacOverrideDrafts[userId] = {};
        }
        this.rbacOverrideDrafts[userId][permissionName] = value;
    }

    saveUserRbac(userId: string): void {
        const draft = this.rbacOverrideDrafts[userId] ?? {};
        const grants: string[] = [];
        const denies: string[] = [];

        for (const permission of this.rbacPermissions) {
            const effect = draft[permission.name] ?? 'INHERIT';
            if (effect === 'GRANT') {
                grants.push(permission.name);
            } else if (effect === 'DENY') {
                denies.push(permission.name);
            }
        }

        this.errorMessage = '';
        this.rbacNotice = '';
        this.savingRbacUser[userId] = true;

        this.adminRbacService.updateUserOverrides(userId, { grants, denies })
            .pipe(finalize(() => {
                this.savingRbacUser[userId] = false;
            }))
            .subscribe((updated) => {
                if (!updated) {
                    this.errorMessage = 'Không thể cập nhật phân quyền RBAC cho tài khoản đã chọn.';
                    return;
                }

                const idx = this.rbacUsers.findIndex((user) => user.userId === userId);
                if (idx >= 0) {
                    this.rbacUsers[idx] = updated;
                }
                this.initializeRbacDraftForUser(updated);
                this.rbacNotice = `Đã cập nhật phân quyền cho ${updated.displayName}.`;
            });
    }

    saveSelectedUserRbac(): void {
        if (!this.selectedRbacUserId) {
            return;
        }
        this.saveUserRbac(this.selectedRbacUserId);
    }

    selectRbacUser(userId: string): void {
        this.selectedRbacUserId = userId;
        this.permissionToAdd = '';
        this.errorMessage = '';
        this.rbacNotice = '';
    }

    get filteredRbacUsers(): RbacUserAssignment[] {
        const keyword = this.rbacUserSearch.trim().toLowerCase();
        if (!keyword) {
            return this.rbacUsers;
        }
        return this.rbacUsers.filter((user) =>
            user.displayName.toLowerCase().includes(keyword)
            || user.email.toLowerCase().includes(keyword));
    }

    get selectedRbacUser(): RbacUserAssignment | null {
        if (!this.selectedRbacUserId) {
            return null;
        }
        return this.rbacUsers.find((user) => user.userId === this.selectedRbacUserId) ?? null;
    }

    get selectedGrantedPermissions(): RbacPermissionDefinition[] {
        const userId = this.selectedRbacUserId;
        if (!userId) {
            return [];
        }
        return this.rbacPermissions.filter((permission) =>
            this.getDraftEffect(userId, permission.name) === 'GRANT');
    }

    get selectedGrantablePermissions(): RbacPermissionDefinition[] {
        const granted = new Set(this.selectedGrantedPermissions.map((permission) => permission.name));
        return this.rbacPermissions.filter((permission) => !granted.has(permission.name));
    }

    addPermissionToSelectedUser(): void {
        if (!this.selectedRbacUserId || !this.permissionToAdd) {
            return;
        }
        this.setDraftEffect(this.selectedRbacUserId, this.permissionToAdd, 'GRANT');
        this.permissionToAdd = '';
    }

    removeGrantedPermission(permissionName: string): void {
        if (!this.selectedRbacUserId) {
            return;
        }
        this.setDraftEffect(this.selectedRbacUserId, permissionName, 'INHERIT');
    }

    permissionLabel(permissionName: string): string {
        switch (permissionName) {
            case 'ADMIN_DASHBOARD_VIEW':
                return 'Truy cập dashboard admin';
            case 'MODERATION_PAPERS_VIEW':
                return 'Xem danh sách bài nghiên cứu chờ duyệt';
            case 'MODERATION_PAPERS_ACTION':
                return 'Duyệt hoặc từ chối bài nghiên cứu';
            case 'MODERATION_POSTS_VIEW':
                return 'Xem danh sách tin tuyển dụng chờ duyệt';
            case 'MODERATION_POSTS_ACTION':
                return 'Duyệt hoặc từ chối tin tuyển dụng';
            case 'RESEARCH_HERO_EDIT':
                return 'Chỉnh nội dung hero trang nghiên cứu';
            case 'RESEARCH_CATEGORY_MANAGE':
                return 'Quản lý danh mục dùng chung';
            default:
                return permissionName;
        }
    }

    formatModerationValue(value?: string | number | null, fallback = 'Chưa cập nhật'): string {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? String(value) : fallback;
        }
        const normalized = (value ?? '').toString().trim();
        return normalized || fallback;
    }

    moderationPostTypeLabel(value?: string | null): string {
        const normalized = this.normalizeEnumValue(value);
        return MODERATION_POST_TYPE_LABELS[normalized] || this.humanizeEnumValue(normalized) || 'Chưa cập nhật';
    }

    moderationJobTypeLabel(value?: string | null): string {
        const normalized = this.normalizeEnumValue(value);
        return MODERATION_JOB_TYPE_LABELS[normalized] || this.humanizeEnumValue(normalized) || 'Chưa cập nhật';
    }

    moderationPostStatusLabel(value?: string | null): string {
        const normalized = this.normalizeEnumValue(value);
        return MODERATION_POST_STATUS_LABELS[normalized] || this.humanizeEnumValue(normalized) || 'Chưa cập nhật';
    }

    moderationResearchCategoryLabel(value?: string | null): string {
        const normalized = this.normalizeEnumValue(value);
        return MODERATION_RESEARCH_CATEGORY_LABELS[normalized] || this.humanizeEnumValue(normalized) || 'Chưa cập nhật';
    }

    toModerationPreviewPost(post: ModerationPostItem): Post {
        const createdAt = this.moderationDate(post.createdAt);
        const updatedAt = this.moderationDate(post.updatedAt, createdAt);

        return {
            id: post.id,
            authorId: '',
            authorName: post.authorName || 'Unknown',
            authorAvatarUrl: post.authorAvatarUrl,
            title: post.title || 'Chưa có tiêu đề',
            description: post.description || post.summary || '',
            requirements: post.requirements,
            achievements: post.achievements,
            benefits: post.benefits,
            postType: (post.postType || 'STUDENT_SEEKING_JOB') as Post['postType'],
            jobType: (post.jobType || 'FULL_TIME') as Post['jobType'],
            tags: [...(post.tags ?? [])],
            studentCvUrl: post.studentCvUrl,
            contactEmail: post.contactEmail,
            contactPhone: post.contactPhone,
            researchPaperLinks: (post.researchPaperLinks ?? []).map((item) => ({
                id: item.id,
                title: item.title,
                url: item.url || ''
            })),
            displayInfo: post.displayInfo,
            location: post.location,
            salaryRange: post.salaryRange,
            status: (post.status || 'OPEN') as Post['status'],
            approvalStatus: post.approvalStatus as Post['approvalStatus'],
            createdAt,
            updatedAt
        };
    }

    isCompanyModerationPost(post: ModerationPostItem | null | undefined): boolean {
        return this.normalizeEnumValue(post?.postType).includes('COMPANY');
    }

    moderationPostAudienceLabel(post: ModerationPostItem | null | undefined): string {
        return this.isCompanyModerationPost(post) ? 'Đối tác doanh nghiệp' : 'Ứng viên tiềm năng';
    }

    moderationStudentInfoValue(post: ModerationPostItem, key: string): string {
        const value = post.displayInfo?.[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }

        if (key === 'studentBio') {
            const fallback = (post.description ?? '').trim();
            if (fallback) {
                return fallback;
            }
        }

        if (key === 'studentAchievements') {
            const fallback = (post.achievements ?? '').trim();
            if (fallback) {
                return fallback;
            }
        }

        return 'Chưa cập nhật';
    }

    openModerationResearchPaper(id?: string): void {
        const paperId = (id ?? '').trim();
        if (!paperId || typeof window === 'undefined') {
            return;
        }

        window.open(`/paper/${paperId}`, '_blank', 'noopener');
    }

    moderationPaperPdfUrl(rawUrl?: string | null): string {
        const value = (rawUrl ?? '').trim();
        if (!value) {
            return '';
        }

        if (value.startsWith('http://') || value.startsWith('https://')) {
            return value.replace('/api/v1/storage/research-pdfs/', '/api/public/storage/research-pdfs/');
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

        return `${API_CONFIG.BASE_URL}/api/public/storage/research-pdfs/${encodeURIComponent(value)}`;
    }

    hasModerationPaperPdf(rawUrl?: string | null): boolean {
        return !!this.moderationPaperPdfUrl(rawUrl);
    }

    moderationDisplayInfoEntries(post: ModerationPostItem): ModerationDisplayInfoEntry[] {
        const raw = post.displayInfo;
        if (!raw || typeof raw !== 'object') {
            return [];
        }

        const displayInfo = raw as Record<string, unknown>;
        const orderedKeys = [
            'studentUniversity',
            'studentMajor',
            'studentType',
            'studentDesiredPosition',
            'studentBio',
            'studentCareerGoal',
            'studentAchievements'
        ];

        const seen = new Set<string>();
        const entries: ModerationDisplayInfoEntry[] = [];

        const pushEntry = (key: string): void => {
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            const formatted = this.formatDisplayInfoValue(displayInfo[key]);
            if (!formatted) {
                return;
            }
            entries.push({
                label: MODERATION_DISPLAY_INFO_LABELS[key] || this.humanizeKey(key),
                value: formatted,
                wide: key === 'studentBio' || key === 'studentCareerGoal' || key === 'studentAchievements' || formatted.length > 120
            });
        };

        orderedKeys.forEach(pushEntry);
        Object.keys(displayInfo).forEach(pushEntry);

        return entries;
    }

    moderationPaperAuthors(paper: ModerationPaperItem) {
        return [...(paper.authors ?? [])].sort((left, right) => {
            const leftOrder = left.authorOrder ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = right.authorOrder ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder;
        });
    }

    isMainModerationAuthor(author: { mainAuthor?: boolean; isMainAuthor?: boolean } | null | undefined): boolean {
        return Boolean(author?.isMainAuthor ?? author?.mainAuthor);
    }

    primaryRole(roles: string[] | null | undefined): string {
        if (!roles || roles.length === 0) {
            return '';
        }
        const normalized = [...new Set(roles
            .map((role) => (role ?? '').toString().trim().toUpperCase())
            .map((role) => role.startsWith('ROLE_') ? role.substring(5) : role)
            .filter((role) => !!role))];
        if (normalized.length === 0) {
            return '';
        }
        return normalized
            .sort((left, right) => this.rolePriority(left) - this.rolePriority(right))[0];
    }

    private resolveInitialTab(): AdminTabKey {
        const firstAccessibleTab = this.adminTabs.find((tab) => this.can(tab.permission));
        return firstAccessibleTab?.key ?? 'POSTS';
    }

    private resolveTabFromQuery(tab: string | null): AdminTabKey | null {
        const normalized = (tab ?? '').trim().toUpperCase();
        if (!normalized) {
            return null;
        }

        const requested = this.adminTabs.find((item) => item.key === normalized);
        if (!requested) {
            return null;
        }

        return this.can(requested.permission) ? requested.key : null;
    }

    private currentTabPermission(): string {
        return this.currentTabConfig?.permission ?? '';
    }

    private loadPendingModeration(): void {
        // Allow VIEW if user has either VIEW or ACTION permission
        const canViewPosts = this.can('MODERATION_POSTS_VIEW') || this.can('MODERATION_POSTS_ACTION');
        const canViewPapers = this.can('MODERATION_PAPERS_VIEW') || this.can('MODERATION_PAPERS_ACTION');

        if (canViewPosts) {
            this.moderationService.getPosts(ApprovalStatus.PENDING).pipe(take(1)).subscribe((posts) => {
                this.pendingPosts.set(posts);
                this.selectedPostIds.update((selected) => selected.filter((id) => posts.some((post) => post.id === id)));
                const activePreview = this.previewPost();
                if (activePreview) {
                    const refreshed = posts.find((post) => post.id === activePreview.id) ?? null;
                    this.previewPost.set(refreshed);
                }
            });
        } else {
            this.pendingPosts.set([]);
            this.selectedPostIds.set([]);
            this.previewPost.set(null);
        }

        if (canViewPapers) {
            this.moderationService.getPapers(ApprovalStatus.PENDING).pipe(take(1)).subscribe((papers) => {
                this.pendingPapers.set(papers);
                this.selectedPaperIds.update((selected) => selected.filter((id) => papers.some((paper) => paper.id === id)));
                const activePreview = this.previewPaper();
                if (activePreview) {
                    const refreshed = papers.find((paper) => paper.id === activePreview.id) ?? null;
                    this.previewPaper.set(refreshed);
                }
            });
        } else {
            this.pendingPapers.set([]);
            this.selectedPaperIds.set([]);
            this.previewPaper.set(null);
        }
    }

    private removePostsFromQueue(ids: string[]): void {
        const removedIds = new Set(ids);
        this.pendingPosts.update((prev) => prev.filter((item) => !removedIds.has(item.id)));
        this.selectedPostIds.update((prev) => prev.filter((id) => !removedIds.has(id)));
        for (const id of ids) {
            delete this.postRejectComments[id];
        }
        const activePreview = this.previewPost();
        if (activePreview && removedIds.has(activePreview.id)) {
            this.previewPost.set(null);
        }
    }

    private removePapersFromQueue(ids: string[]): void {
        const removedIds = new Set(ids);
        this.pendingPapers.update((prev) => prev.filter((item) => !removedIds.has(item.id)));
        this.selectedPaperIds.update((prev) => prev.filter((id) => !removedIds.has(id)));
        for (const id of ids) {
            delete this.paperRejectComments[id];
        }
        const activePreview = this.previewPaper();
        if (activePreview && removedIds.has(activePreview.id)) {
            this.previewPaper.set(null);
        }
    }

    private loadHeroContent(): void {
        if (!this.can('RESEARCH_HERO_EDIT')) {
            return;
        }

        this.contentService.getResearchHeroContent().subscribe((hero) => {
            this.heroForm = {
                titlePrefix: hero.titlePrefix,
                titleHighlight: hero.titleHighlight,
                subtitle: hero.subtitle,
                imageUrl: hero.imageUrl
            };
        });
    }

    private loadNews(): void {
        if (!this.can('RESEARCH_HERO_EDIT')) {
            this.newsItems = [];
            return;
        }

        this.adminNewsService.getAll().subscribe((items) => {
            this.newsItems = items;
        });
    }

    private loadSpecializations(): void {
        if (!this.can('RESEARCH_CATEGORY_MANAGE')) {
            this.specializations = [];
            return;
        }

        this.adminSpecializationService.getAll().subscribe((items) => {
            this.specializations = items;
        });
    }

    private loadResearchCategories(): void {
        if (!this.can('RESEARCH_CATEGORY_MANAGE')) {
            this.researchCategories = [];
            return;
        }

        this.adminResearchCategoryService.getAll().subscribe((categories) => {
            this.researchCategories = categories;
        });
    }

    private loadRbacData(): void {
        if (!this.can('RBAC_MANAGE')) {
            return;
        }

        forkJoin({
            permissions: this.adminRbacService.getDelegablePermissions(),
            roleMatrix: this.adminRbacService.getRolePermissionMatrix(),
            users: this.adminRbacService.getUsers()
        }).subscribe(({ permissions, roleMatrix, users }) => {
            this.rbacPermissions = permissions;
            this.rbacRoleMatrix = roleMatrix;
            this.rbacRolePriority = this.buildRolePriority(roleMatrix);
            this.rbacUsers = users.map((user) => {
                const primaryRole = this.primaryRole(user.roles);
                return {
                    ...user,
                    roles: primaryRole ? [primaryRole] : []
                };
            });
            this.initializeRbacDrafts();
            if (!this.selectedRbacUserId || !this.rbacUsers.some((user) => user.userId === this.selectedRbacUserId)) {
                this.selectedRbacUserId = this.rbacUsers.length > 0 ? this.rbacUsers[0].userId : null;
            }
            this.permissionToAdd = '';
        });
    }

    private rolePriority(roleName: string): number {
        const normalized = (roleName ?? '').toString().trim().toUpperCase().replace(/^ROLE_/, '');
        const matrixPriority = this.rbacRolePriority[normalized];
        if (Number.isFinite(matrixPriority)) {
            return matrixPriority;
        }

        switch (normalized) {
            case 'ADMIN':
                return 1;
            case 'LECTURER':
                return 2;
            case 'COMPANY':
                return 3;
            case 'STUDENT':
                return 4;
            default:
                return 99;
        }
    }

    private formatDisplayInfoValue(value: unknown): string {
        if (typeof value === 'string') {
            const normalized = value.trim();
            return normalized || '';
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (Array.isArray(value)) {
            return value
                .map((item) => this.formatDisplayInfoValue(item))
                .filter((item) => !!item)
                .join(', ');
        }
        return '';
    }

    private normalizeEnumValue(value?: string | null): string {
        return (value ?? '').toString().trim().toUpperCase();
    }

    private moderationDate(value?: string | null, fallback = new Date()): Date {
        if (!value) {
            return new Date(fallback);
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
    }

    private humanizeEnumValue(value?: string | null): string {
        const normalized = this.normalizeEnumValue(value);
        if (!normalized) {
            return '';
        }
        return normalized
            .split('_')
            .filter((part) => !!part)
            .map((part) => part.charAt(0) + part.substring(1).toLowerCase())
            .join(' ');
    }

    private humanizeKey(value: string): string {
        return value
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^./, (char) => char.toUpperCase());
    }

    private buildRolePriority(roleMatrix: RbacRolePermission[]): Record<string, number> {
        const priority: Record<string, number> = {};

        roleMatrix
            .map((entry) => (entry.role ?? '').toString().trim().toUpperCase().replace(/^ROLE_/, ''))
            .filter((role, index, array) => !!role && array.indexOf(role) === index)
            .forEach((role, index) => {
                priority[role] = index + 1;
            });

        return priority;
    }

    private initializeRbacDrafts(): void {
        this.rbacOverrideDrafts = {};
        for (const user of this.rbacUsers) {
            this.initializeRbacDraftForUser(user);
        }
    }

    private initializeRbacDraftForUser(user: RbacUserAssignment): void {
        const draft: Record<string, PermissionOverrideDraftEffect> = {};

        for (const permission of this.rbacPermissions) {
            draft[permission.name] = 'INHERIT';
        }

        for (const override of user.overrides ?? []) {
            if (!(override.permission in draft)) {
                continue;
            }
            draft[override.permission] = override.effect === 'DENY' ? 'DENY' : 'GRANT';
        }

        this.rbacOverrideDrafts[user.userId] = draft;
    }
}
