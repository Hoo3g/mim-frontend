import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { authSignal } from '../../../core/signals/auth.signal';
import { AdminModerationService } from '../../../core/services/admin-moderation.service';
import { AdminContentService } from '../../../core/services/admin-content.service';
import { ContentService } from '../../../core/services/content.service';
import { AdminRbacService } from '../../../core/services/admin-rbac.service';
import { ModerationPaperItem, ModerationPostItem } from '../../../core/models/admin-moderation.model';
import {
    PermissionOverrideDraftEffect,
    RbacPermissionDefinition,
    RbacUserAssignment
} from '../../../core/models/rbac.model';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
    <div class="min-h-screen bg-gray-50/50">
      <div class="bg-gray-900 text-white py-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-end">
            <div>
              <h1 class="text-3xl font-black uppercase tracking-tighter mb-2">QUẢN TRỊ VIÊN</h1>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hệ thống quản trị RBAC & nội dung MIM</p>
            </div>
            <div class="flex gap-4 mb-1">
              <div class="text-right">
                <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Đang chờ duyệt</p>
                <p class="text-2xl font-black text-hus-blue">{{ pendingPosts.length + pendingPapers.length }} Item</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-b border-gray-200 bg-white sticky top-16 z-10 transition-all">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex gap-8 overflow-x-auto">
            <button *ngIf="can('MODERATION_POSTS_VIEW')"
                    (click)="currentTab = 'POSTS'"
                    [class.border-hus-blue]="currentTab === 'POSTS'"
                    [class.text-hus-blue]="currentTab === 'POSTS'"
                    class="py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all whitespace-nowrap">
              Tin Tuyển dụng ({{ pendingPosts.length }})
            </button>
            <button *ngIf="can('MODERATION_PAPERS_VIEW')"
                    (click)="currentTab = 'PAPERS'"
                    [class.border-hus-blue]="currentTab === 'PAPERS'"
                    [class.text-hus-blue]="currentTab === 'PAPERS'"
                    class="py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all whitespace-nowrap">
              Bài báo khoa học ({{ pendingPapers.length }})
            </button>
            <button *ngIf="can('RESEARCH_HERO_EDIT')"
                    (click)="currentTab = 'HERO'"
                    [class.border-hus-blue]="currentTab === 'HERO'"
                    [class.text-hus-blue]="currentTab === 'HERO'"
                    class="py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all whitespace-nowrap">
              Trang Nghiên cứu
            </button>
            <button *ngIf="can('RBAC_MANAGE')"
                    (click)="currentTab = 'RBAC'"
                    [class.border-hus-blue]="currentTab === 'RBAC'"
                    [class.text-hus-blue]="currentTab === 'RBAC'"
                    class="py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all whitespace-nowrap">
              Phân quyền RBAC
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div *ngIf="errorMessage" class="mb-6 border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-4 py-3">
          {{ errorMessage }}
        </div>

        <div *ngIf="!hasAnyTabAccess()" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
          Tài khoản này chưa được cấp quyền thao tác trong trang quản trị.
        </div>

        <div *ngIf="currentTab === 'POSTS' && can('MODERATION_POSTS_VIEW')" class="space-y-4">
          <div *ngFor="let post of pendingPosts" class="bg-white border border-gray-100 p-6 space-y-4 group hover:border-hus-blue transition-all">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div class="flex-grow">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-[9px] font-black bg-gray-100 px-2 py-0.5 uppercase tracking-widest">{{ post.authorName }}</span>
                  <span class="text-[9px] text-gray-400 uppercase tabular-nums">{{ post.createdAt | date:'dd.MM.yyyy' }}</span>
                </div>
                <h3 class="text-lg font-bold text-gray-900 group-hover:text-hus-blue transition-colors">{{ post.title }}</h3>
                <p class="text-[11px] text-gray-500 line-clamp-2 mt-1">{{ post.summary }}</p>
              </div>
              <div class="flex gap-3 flex-shrink-0" *ngIf="can('MODERATION_POSTS_ACTION')">
                <button (click)="approvePost(post.id)" class="px-6 py-2 bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-hus-dark transition-all">Duyệt</button>
                <button (click)="rejectPost(post.id)" class="px-6 py-2 bg-white border border-red-200 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Từ chối</button>
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
          <div *ngIf="pendingPosts.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
            Không có bài đăng nào đang chờ duyệt.
          </div>
        </div>

        <div *ngIf="currentTab === 'PAPERS' && can('MODERATION_PAPERS_VIEW')" class="space-y-4">
          <div *ngFor="let paper of pendingPapers" class="bg-white border border-gray-100 p-6 space-y-4 group hover:border-hus-blue transition-all">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div class="flex-grow">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-[9px] font-black bg-blue-50 text-hus-blue px-2 py-0.5 uppercase tracking-widest">{{ paper.authorName }}</span>
                  <span class="text-[9px] text-gray-400 uppercase tabular-nums">{{ paper.category }}</span>
                </div>
                <h3 class="text-lg font-bold text-gray-900 group-hover:text-hus-blue transition-colors">{{ paper.title }}</h3>
              </div>
              <div class="flex gap-3 flex-shrink-0" *ngIf="can('MODERATION_PAPERS_ACTION')">
                <button (click)="approvePaper(paper.id)" class="px-6 py-2 bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-hus-dark transition-all">Duyệt</button>
                <button (click)="rejectPaper(paper.id)" class="px-6 py-2 bg-white border border-red-200 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Từ chối</button>
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
          <div *ngIf="pendingPapers.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
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
                  <p class="mt-1 text-[9px] text-gray-400 uppercase tracking-widest">Role: {{ user.roles.join(', ') || 'N/A' }}</p>
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
                <p class="mt-2 text-[10px] text-gray-500">Vai trò hiện tại: <span class="font-bold uppercase">{{ selected.roles.join(', ') || 'N/A' }}</span></p>
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
      </div>
    </div>
  `,
    styles: []
})
export class AdminDashboardComponent implements OnInit {
    private readonly moderationService = inject(AdminModerationService);
    private readonly contentService = inject(ContentService);
    private readonly adminContentService = inject(AdminContentService);
    private readonly adminRbacService = inject(AdminRbacService);

    currentTab: 'POSTS' | 'PAPERS' | 'HERO' | 'RBAC' = 'POSTS';

    pendingPosts: ModerationPostItem[] = [];
    pendingPapers: ModerationPaperItem[] = [];

    postRejectComments: Record<string, string> = {};
    paperRejectComments: Record<string, string> = {};

    heroForm = {
        titlePrefix: '',
        titleHighlight: '',
        subtitle: '',
        imageUrl: ''
    };
    isSavingHero = false;

    rbacPermissions: RbacPermissionDefinition[] = [];
    rbacUsers: RbacUserAssignment[] = [];
    rbacOverrideDrafts: Record<string, Record<string, PermissionOverrideDraftEffect>> = {};
    savingRbacUser: Record<string, boolean> = {};
    rbacUserSearch = '';
    selectedRbacUserId: string | null = null;
    permissionToAdd = '';

    heroNotice = '';
    rbacNotice = '';
    errorMessage = '';

    ngOnInit(): void {
        this.currentTab = this.resolveInitialTab();
        this.loadPendingModeration();
        this.loadHeroContent();
        this.loadRbacData();
    }

    can(permission: string): boolean {
        return authSignal.hasPermission(permission);
    }

    hasAnyTabAccess(): boolean {
        return this.can('MODERATION_POSTS_VIEW')
            || this.can('MODERATION_PAPERS_VIEW')
            || this.can('RESEARCH_HERO_EDIT')
            || this.can('RBAC_MANAGE');
    }

    approvePost(id: string): void {
        this.errorMessage = '';
        this.moderationService.approvePost(id).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Không thể duyệt bài tuyển dụng.';
                return;
            }
            this.pendingPosts = this.pendingPosts.filter((item) => item.id !== id);
            delete this.postRejectComments[id];
        });
    }

    rejectPost(id: string): void {
        this.errorMessage = '';
        const comment = this.postRejectComments[id] ?? '';
        this.moderationService.rejectPost(id, comment).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Không thể từ chối bài tuyển dụng.';
                return;
            }
            this.pendingPosts = this.pendingPosts.filter((item) => item.id !== id);
            delete this.postRejectComments[id];
        });
    }

    approvePaper(id: string): void {
        this.errorMessage = '';
        this.moderationService.approvePaper(id).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Không thể duyệt bài nghiên cứu.';
                return;
            }
            this.pendingPapers = this.pendingPapers.filter((item) => item.id !== id);
            delete this.paperRejectComments[id];
        });
    }

    rejectPaper(id: string): void {
        this.errorMessage = '';
        const comment = this.paperRejectComments[id] ?? '';
        this.moderationService.rejectPaper(id, comment).subscribe((ok) => {
            if (!ok) {
                this.errorMessage = 'Không thể từ chối bài nghiên cứu.';
                return;
            }
            this.pendingPapers = this.pendingPapers.filter((item) => item.id !== id);
            delete this.paperRejectComments[id];
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
            default:
                return permissionName;
        }
    }

    private resolveInitialTab(): 'POSTS' | 'PAPERS' | 'HERO' | 'RBAC' {
        if (this.can('MODERATION_POSTS_VIEW')) {
            return 'POSTS';
        }
        if (this.can('MODERATION_PAPERS_VIEW')) {
            return 'PAPERS';
        }
        if (this.can('RESEARCH_HERO_EDIT')) {
            return 'HERO';
        }
        if (this.can('RBAC_MANAGE')) {
            return 'RBAC';
        }
        return 'POSTS';
    }

    private loadPendingModeration(): void {
        if (this.can('MODERATION_POSTS_VIEW')) {
            this.moderationService.getPosts('PENDING').subscribe((posts) => {
                this.pendingPosts = posts;
            });
        } else {
            this.pendingPosts = [];
        }

        if (this.can('MODERATION_PAPERS_VIEW')) {
            this.moderationService.getPapers('PENDING').subscribe((papers) => {
                this.pendingPapers = papers;
            });
        } else {
            this.pendingPapers = [];
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

    private loadRbacData(): void {
        if (!this.can('RBAC_MANAGE')) {
            return;
        }

        forkJoin({
            permissions: this.adminRbacService.getDelegablePermissions(),
            users: this.adminRbacService.getUsers()
        }).subscribe(({ permissions, users }) => {
            this.rbacPermissions = permissions;
            this.rbacUsers = users;
            this.initializeRbacDrafts();
            if (!this.selectedRbacUserId || !this.rbacUsers.some((user) => user.userId === this.selectedRbacUserId)) {
                this.selectedRbacUserId = this.rbacUsers.length > 0 ? this.rbacUsers[0].userId : null;
            }
            this.permissionToAdd = '';
        });
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
