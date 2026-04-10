import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { Post } from '../../core/models/post.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PostDetailComponent } from './post-detail.component';
import { RecruitmentCategoryService } from '../../core/services/recruitment-category.service';
import { ResearchCategory } from '../../core/models/research-category.model';
import { authSignal } from '../../core/signals/auth.signal';
import { ROUTES } from '../../core/constants/route.const';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PostDetailComponent, LoadingSpinnerComponent],
  template: `
    <div class="bg-white min-h-screen">
      
      <!-- Minimal Header - Brand Accented -->
      <div class="border-b border-gray-100 bg-blue-50/10 py-5 md:py-8">
        <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tighter mb-1 flex items-center gap-2">
                <span class="w-1 h-6 bg-hus-blue"></span>
                Tuyển dụng & Sự nghiệp
              </h1>
              <p class="text-[10px] font-bold text-hus-blue uppercase tracking-widest pl-3">
                Kết nối sinh viên MIM với cơ hội nghề nghiệp
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-10">
        <div class="flex flex-col lg:flex-row gap-6 lg:gap-10">
          
          <!-- LEFT: Sidebar (Filters & Search) -->
	          <div class="lg:w-64 flex-shrink-0">
	            <button type="button"
	                    (click)="showMobileFilters = !showMobileFilters"
	                    class="lg:hidden w-full inline-flex items-center justify-between border border-gray-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 mb-4">
	              <span class="inline-flex items-center gap-2">
	                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
	                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
	                </svg>
	                <span>Bộ lọc tuyển dụng</span>
	              </span>
	              <span [class.rotate-180]="showMobileFilters" class="transition-transform">⌄</span>
	            </button>

		            <div class="space-y-6 md:space-y-8 lg:sticky lg:block"
		                 [ngClass]="showMobileFilters ? 'block' : 'hidden'"
		                 [style.top]="'var(--app-nav-sidebar-offset, 124px)'">
		              
		              <!-- Search -->
		              <section>
		                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Tìm kiếm</h3>
                <div class="relative">
                  <input type="text" 
                         [ngModel]="searchTerm"
                         (ngModelChange)="onSearchChange($event)"
                         placeholder="Tên công việc, vị trí..."
		                         class="w-full bg-gray-50 border border-hus-blue/30 px-3 py-2 text-xs focus:ring-1 focus:ring-hus-blue/30 focus:border-hus-blue outline-none transition-all font-medium">
		                </div>
		              </section>

		              <div class="overflow-hidden border border-hus-blue/20 bg-white shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)] lg:overflow-visible lg:border-0 lg:bg-transparent lg:shadow-none lg:space-y-4">
		                <section class="bg-white border-t border-hus-blue/20 first:border-t-0 lg:border lg:border-hus-blue/30 lg:shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)]">
		                  <button
		                    type="button"
		                    (click)="toggleMobileSection('roles')"
		                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue border-b border-hus-blue">
		                    <h3 class="text-[10px] font-bold text-white uppercase tracking-widest">Bài đăng</h3>
		                    <span *ngIf="isMobileViewport"
		                          class="text-sm font-black text-white/80 leading-none min-w-[1rem] text-right">
		                      {{ isMobileSectionOpen('roles') ? '-' : '+' }}
		                    </span>
		                  </button>

		                  <div *ngIf="shouldShowSection('roles')" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
		                    <button
		                      type="button"
		                      (click)="setFilter('COMPANY')"
		                      [class.text-hus-blue]="filterType === 'COMPANY'"
		                      [class.bg-blue-50]="filterType === 'COMPANY'"
		                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
		                      <span
		                        class="w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center"
		                        [ngClass]="filterType === 'COMPANY' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
		                        <svg
		                          *ngIf="filterType === 'COMPANY'"
		                          viewBox="0 0 12 12"
		                          class="w-2.5 h-2.5 text-white"
		                          fill="none"
		                          stroke="currentColor"
		                          stroke-width="2"
		                          aria-hidden="true">
		                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
		                        </svg>
		                      </span>
		                      <span>Doanh nghiệp</span>
		                    </button>
		                    <button
		                      type="button"
		                      (click)="setFilter('STUDENT')"
		                      [class.text-hus-blue]="filterType === 'STUDENT'"
		                      [class.bg-blue-50]="filterType === 'STUDENT'"
		                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
		                      <span
		                        class="w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center"
		                        [ngClass]="filterType === 'STUDENT' ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
		                        <svg
		                          *ngIf="filterType === 'STUDENT'"
		                          viewBox="0 0 12 12"
		                          class="w-2.5 h-2.5 text-white"
		                          fill="none"
		                          stroke="currentColor"
		                          stroke-width="2"
		                          aria-hidden="true">
		                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
		                        </svg>
		                      </span>
		                      <span>Sinh viên</span>
		                    </button>
		                  </div>
		                </section>

		                <section class="bg-white border-t border-hus-blue/20 first:border-t-0 lg:border lg:border-hus-blue/30 lg:shadow-[0_16px_32px_-28px_rgba(30,102,170,0.35)]">
		                  <button
		                    type="button"
		                    (click)="toggleMobileSection('categories')"
		                    class="w-full flex items-center justify-between gap-3 text-left px-3 py-3 sm:px-4 bg-hus-blue border-b border-hus-blue">
		                    <h3 class="text-[10px] font-bold text-white uppercase tracking-widest">Danh mục</h3>
		                    <span *ngIf="isMobileViewport"
		                          class="text-sm font-black text-white/80 leading-none min-w-[1rem] text-right">
		                      {{ isMobileSectionOpen('categories') ? '-' : '+' }}
		                    </span>
		                  </button>

		                  <div *ngIf="shouldShowSection('categories') && isLoadingCategories" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
		                    <div *ngFor="let item of [1, 2, 3, 4]" class="h-9 border border-gray-100 bg-gray-50 animate-pulse"></div>
		                  </div>

		                  <div *ngIf="shouldShowSection('categories') && !isLoadingCategories" class="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
		                    <button
		                      type="button"
		                      *ngFor="let category of categories"
		                      (click)="toggleCategoryFilter(category.name)"
		                      [class.text-hus-blue]="isCategorySelected(category.name)"
		                      [class.bg-blue-50]="isCategorySelected(category.name)"
		                      class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex items-center gap-3">
		                      <span
		                        class="w-3.5 h-3.5 border transition-colors flex items-center justify-center"
		                        [ngClass]="isCategorySelected(category.name) ? 'border-hus-blue bg-hus-blue' : 'border-gray-300 bg-white'">
		                        <svg
		                          *ngIf="isCategorySelected(category.name)"
		                          viewBox="0 0 12 12"
		                          class="w-2.5 h-2.5 text-white"
		                          fill="none"
		                          stroke="currentColor"
		                          stroke-width="2"
		                          aria-hidden="true">
		                          <path d="M2.5 6.3 4.8 8.6 9.5 3.8" stroke-linecap="round" stroke-linejoin="round"></path>
		                        </svg>
		                      </span>
		                      <span class="break-words">{{ category.name }}</span>
		                    </button>
		                    <div
		                      *ngIf="categories.length === 0"
		                      class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 border border-dashed border-gray-100">
		                      Chưa có danh mục
		                    </div>
		                  </div>
		                </section>
		              </div>

		              <section *ngIf="shouldShowFilterActions" class="pt-4 border-t border-hus-blue/20">
		                <div class="flex justify-center">
		                  <button
		                    type="button"
		                    (click)="clearFilters()"
		                    class="px-4 py-2 border border-hus-blue/30 text-hus-blue text-[10px] font-black uppercase tracking-widest hover:bg-blue-50/40 transition-colors">
		                    Xóa bộ lọc
		                  </button>
		                </div>
		              </section>

		            </div>
		          </div>

	          <div class="lg:hidden mb-6">
	            <div class="relative border-t border-gray-200">
	              <span aria-hidden="true" class="absolute left-0 -top-px h-0.5 w-[72px] bg-hus-blue"></span>
	            </div>
	          </div>

	          <!-- RIGHT: Main Content (Compact Cards) -->
	          <div class="flex-grow">
            <div *ngIf="!isLoadingPosts || posts.length > 0; else loading">
              <div *ngIf="posts.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
                Không tìm thấy thông tin phù hợp.
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div *ngFor="let post of posts" 
                     (click)="openDetail(post)"
                     class="bg-white border border-gray-100 p-6 hover:border-hus-blue hover:shadow-lg transition-all duration-300 group flex flex-col relative cursor-pointer self-start">
                  
                  <!-- Author Identity Section - Refined -->
                  <div class="flex items-start justify-between mb-6">
                    <div class="flex items-center gap-4 min-w-0">
                      <!-- Avatar with subtle status ring -->
                      <div class="relative">
                        <div class="w-11 h-11 flex-shrink-0 bg-white border-2 border-gray-50 shadow-sm overflow-hidden group-hover:border-hus-blue/20 transition-all duration-500 transform group-hover:scale-105">
                          <img *ngIf="post.authorAvatarUrl" [src]="post.authorAvatarUrl" [alt]="post.authorName" class="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all">
                          <div *ngIf="!post.authorAvatarUrl" class="w-full h-full flex items-center justify-center bg-gray-50 text-[13px] font-black text-hus-blue/40 uppercase">
                            {{ post.authorName.charAt(0) }}
                          </div>
                        </div>
                        <!-- Status Accent -->
                        <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white flex items-center justify-center border border-gray-50 shadow-sm">
                           <div class="w-1.5 h-1.5" [ngClass]="post.postType.includes('COMPANY') ? 'bg-hus-blue animate-pulse' : 'bg-green-500'"></div>
                        </div>
                      </div>
                      
                      <div class="flex flex-col min-w-0">
                        <div class="text-[15px] sm:text-base font-black text-gray-900 leading-tight mb-1 group-hover:text-hus-blue transition-colors truncate">
                          {{ post.authorName }}
                        </div>
                        <div class="flex items-center gap-2">
                          <span [ngClass]="{
                            'text-hus-blue bg-blue-50/50': post.postType.includes('COMPANY'),
                            'text-gray-500 bg-gray-50': !post.postType.includes('COMPANY')
                          }" class="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5">
                            {{ post.postType.includes('COMPANY') ? 'Đối tác doanh nghiệp' : 'Ứng viên tiềm năng' }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                       <span class="text-[10px] font-black text-gray-600 uppercase tracking-wide tabular-nums">{{ post.createdAt | date:'dd.MM.yyyy' }}</span>
                       <div class="w-5 h-0.5 bg-hus-blue/70 group-hover:bg-hus-blue transition-colors"></div>
                    </div>
                  </div>

                  <h3 class="text-lg sm:text-[1.4rem] font-bold text-gray-900 mb-3 leading-tight group-hover:translate-x-1 transition-all duration-300 line-clamp-2 min-h-[3.2rem]">
                    {{ post.title }}
                  </h3>
                  
                  <p class="text-[13px] sm:text-sm text-gray-600 font-normal leading-7 mb-5 line-clamp-3 whitespace-pre-line [overflow-wrap:anywhere]">{{ post.description }}</p>

                  <div class="space-y-4 mb-2">
                    <div *ngIf="!post.postType.includes('COMPANY')" class="border border-gray-100 bg-gray-50/60 p-3">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div>
                          <p class="text-[9px] font-black uppercase tracking-widest text-gray-400">Trường</p>
                          <p class="text-[12px] font-bold text-gray-900 mt-1.5 line-clamp-1">
                            {{ studentDisplayValue(post, 'studentUniversity') }}
                          </p>
                        </div>
                        <div>
                          <p class="text-[9px] font-black uppercase tracking-widest text-gray-400">Chuyên ngành</p>
                          <p class="text-[12px] font-bold text-gray-900 mt-1.5 line-clamp-1">
                            {{ studentDisplayValue(post, 'studentMajor') }}
                          </p>
                        </div>
                      </div>
                    </div>


                    <div *ngIf="!post.postType.includes('COMPANY')" class="pt-3 border-t border-gray-50">
                      <h4 class="text-[9px] font-bold text-hus-blue uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <span class="w-1 h-1 bg-hus-blue"></span>
                        Thành tích nổi bật
                      </h4>
                      <p class="text-[12px] text-gray-700 leading-6 font-medium line-clamp-3">
                        {{ studentDisplayValue(post, 'studentAchievements') }}
                      </p>
                    </div>

                    <div *ngIf="!post.postType.includes('COMPANY')" class="pt-3 border-t border-gray-50">
                      <h4 class="text-[9px] font-bold text-gray-900 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <span class="w-1 h-1 bg-gray-900"></span>
                        Mong muốn nghề nghiệp
                      </h4>
                      <p class="text-[12px] text-gray-700 leading-6 font-medium line-clamp-3">
                        {{ studentDisplayValue(post, 'studentCareerGoal') }}
                      </p>
                    </div>

                    <!-- Requirements (for Companies) -->
                    <div *ngIf="post.postType.includes('COMPANY') && post.requirements" class="pt-3 border-t border-gray-50">
                      <h4 class="text-[9px] font-bold text-gray-900 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <span class="w-1 h-1 bg-gray-900"></span>
                        Yêu cầu ứng viên
                      </h4>
                      <p class="text-[12px] text-gray-700 leading-6 font-medium line-clamp-3 whitespace-pre-line [overflow-wrap:anywhere]">
                        {{ post.requirements }}
                      </p>
                    </div>
                  </div>

                  <div *ngIf="post.salaryRange" class="mt-4 pt-4 border-t border-gray-50 flex items-center">
                    <div class="flex items-center gap-1 text-[10px] font-bold text-hus-blue uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ post.salaryRange }}</span>
                    </div>
                  </div>

                </div>
              </div>

	              <div *ngIf="hasMorePosts" class="mt-4 border-t border-gray-200 pt-4 flex justify-center">
	                <button
	                  type="button"
                  (click)="loadMorePosts($event)"
                  [disabled]="isLoadingPosts"
                  class="inline-flex items-center justify-center border border-hus-blue px-3 py-1 text-[11px] font-black leading-none text-hus-blue transition-colors hover:bg-hus-blue hover:text-white touch-manipulation">
                  <span>Xem thêm</span>
	                </button>
	              </div>

	              
	            </div>

            <ng-template #loading>
              <app-loading-spinner [size]="52"></app-loading-spinner>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Detail Overlay -->
      <app-post-detail *ngIf="selectedPost" 
                       [post]="selectedPost" 
                       (close)="closeDetail()">
      </app-post-detail>
    </div>
  `
})
export class PostsComponent implements OnInit {
  private static readonly CATEGORY_STATE_KEY = 'recruitmentFilterCategories';
  private readonly postService = inject(PostService);
  private readonly recruitmentCategoryService = inject(RecruitmentCategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly searchTermChanges = new Subject<string>();
  protected readonly ROUTES = ROUTES;

  searchTerm = '';
  categories: ResearchCategory[] = [];

  posts: Post[] = [];
  isLoadingCategories = true;
  isLoadingPosts = false;
  hasMorePosts = false;
  filterType: 'COMPANY' | 'STUDENT' = 'COMPANY';
  selectedCategories: string[] = [];
  selectedPost: Post | null = null;
  showMobileFilters = false;
  isMobileViewport = false;
  mobileSectionsOpen: Record<'roles' | 'categories', boolean> = {
    roles: false,
    categories: false
  };
  private currentPage = 0;
  private readonly pageSize = 10;
  private readonly mobileBreakpoint = 768;

  ngOnInit(): void {
    this.updateViewportState();
    this.searchTermChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.syncFiltersToUrl();
      });

    this.loadCategories();
    this.route.queryParamMap.subscribe((params) => {
      const type = params.get('type');
      const keyword = params.get('q');
      const selectedCategories = this.parseCategoriesFromQuery(
        params.getAll('category'),
        params.get('category'),
        params.getAll('specialization'),
        params.get('specialization')
      );

      this.filterType = type === 'STUDENT' ? 'STUDENT' : 'COMPANY';
      this.selectedCategories = selectedCategories.length > 0
        ? selectedCategories
        : this.readSelectedCategoriesFromHistoryState();
      this.searchTerm = keyword?.trim() ?? '';
      this.resetAndLoadPosts();
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  get shouldShowFilterActions(): boolean {
    return this.filterType !== 'COMPANY' || this.selectedCategories.length > 0 || !!this.searchTerm.trim();
  }

  onSearchChange(val: string): void {
    this.searchTerm = val;
    this.searchTermChanges.next(val.trim());
  }

  setFilter(type: 'COMPANY' | 'STUDENT'): void {
    this.filterType = type;
    this.syncFiltersToUrl();
  }

  toggleCategoryFilter(value: string): void {
    const normalizedValue = (value ?? '').trim();
    if (!normalizedValue) {
      return;
    }

    if (this.selectedCategories.includes(normalizedValue)) {
      this.selectedCategories = this.selectedCategories.filter((item) => item !== normalizedValue);
      this.syncFiltersToUrl();
      return;
    }

    this.selectedCategories = [...this.selectedCategories, normalizedValue];
    this.syncFiltersToUrl();
  }

  isCategorySelected(value: string): boolean {
    return this.selectedCategories.includes((value ?? '').trim());
  }

  shouldShowSection(section: 'roles' | 'categories'): boolean {
    return !this.isMobileViewport || this.mobileSectionsOpen[section];
  }

  toggleMobileSection(section: 'roles' | 'categories'): void {
    if (!this.isMobileViewport) {
      return;
    }

    this.mobileSectionsOpen[section] = !this.mobileSectionsOpen[section];
  }

  isMobileSectionOpen(section: 'roles' | 'categories'): boolean {
    return this.mobileSectionsOpen[section];
  }

  clearFilters(): void {
    this.filterType = 'COMPANY';
    this.selectedCategories = [];
    this.searchTerm = '';
    this.syncFiltersToUrl();
  }

  loadMorePosts(event?: Event): void {
    this.blurLoadMoreTrigger(event);
    this.loadNextPage();
  }

  openDetail(post: Post): void {
    this.selectedPost = post;
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  }

  closeDetail(): void {
    this.selectedPost = null;
    document.body.style.overflow = 'auto';
  }

  private loadCategories(): void {
    this.recruitmentCategoryService.getActiveCategories().subscribe((items) => {
      this.categories = items;
      this.isLoadingCategories = false;
      this.cdr.detectChanges();
    });
  }

  studentDisplayValue(post: Post, key: string): string {
    const fromDisplayInfo = this.readDisplayInfo(post, key);
    if (fromDisplayInfo) {
      return fromDisplayInfo;
    }

    if (key === 'studentBio') {
      const fallbackBio = (post.description ?? '').trim();
      if (fallbackBio) {
        return fallbackBio;
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

  private readDisplayInfo(post: Post, key: string): string {
    const value = post.displayInfo?.[key];
    return typeof value === 'string' ? value.trim() : '';
  }

  private loadPostsPage(page: number): void {
    this.postService.getPostsPage({
      type: this.filterType,
      category: this.selectedCategories,
      q: this.searchTerm
    }, page, this.pageSize).subscribe({
      next: (result) => {
        const incoming = result.content ?? [];
        this.posts = page === 0 ? incoming : [...this.posts, ...incoming];
        const totalElements = result.pageInfo?.totalElements ?? this.posts.length;
        this.hasMorePosts = this.posts.length < totalElements;
        this.currentPage = page + 1;
        this.cdr.detectChanges();
      },
      error: () => {
        if (page === 0) {
          this.posts = [];
        }
        this.hasMorePosts = false;
        this.isLoadingPosts = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isLoadingPosts = false;
        this.cdr.detectChanges();
      }
    });
  }

  private syncFiltersToUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildPostQueryParams(),
      queryParamsHandling: '',
      replaceUrl: true,
      state: {
        ...(typeof history !== 'undefined' ? history.state as Record<string, unknown> : {}),
        [PostsComponent.CATEGORY_STATE_KEY]: [...this.selectedCategories]
      }
    });
  }

  private parseCategoriesFromQuery(categories: string[], categoryFallback: string | null, legacySpecializations: string[], legacyFallback: string | null): string[] {
    const resolved = categories.length > 0
      ? categories
      : legacySpecializations.length > 0
        ? legacySpecializations
        : [];

    if (resolved.length > 0) {
      return resolved
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter((item, index, arr) => !!item && arr.indexOf(item) === index);
    }

    const fallback = categoryFallback?.trim() ? categoryFallback : legacyFallback;
    if (!fallback?.trim()) {
      return [];
    }

    return fallback
      .split(',')
      .map((item) => item.trim())
      .filter((item, index, arr) => !!item && arr.indexOf(item) === index);
  }

  private buildPostQueryParams(): { type: 'COMPANY' | 'STUDENT'; category: string[] | null; q: string | null } {
    return {
      type: this.filterType,
      category: this.selectedCategories.length > 0 ? this.selectedCategories : null,
      q: this.searchTerm.trim() || null
    };
  }

  private readSelectedCategoriesFromHistoryState(): string[] {
    if (typeof history === 'undefined') {
      return [];
    }

    const rawValue = (history.state as Record<string, unknown> | null)?.[PostsComponent.CATEGORY_STATE_KEY];
    if (!Array.isArray(rawValue)) {
      return [];
    }

    return rawValue
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter((item, index, arr) => !!item && arr.indexOf(item) === index);
  }

  private resetAndLoadPosts(): void {
    this.currentPage = 0;
    this.posts = [];
    this.hasMorePosts = false;
    this.loadNextPage(true);
  }

  private loadNextPage(reset = false): void {
    if (this.isLoadingPosts) {
      return;
    }
    if (!reset && !this.hasMorePosts) {
      return;
    }

    this.isLoadingPosts = true;
    this.loadPostsPage(this.currentPage);
  }

  canManageRecruitmentPosts(): boolean {
    const role = authSignal.user()?.role;
    return role === 'STUDENT' || role === 'COMPANY';
  }

  private updateViewportState(): void {
    this.isMobileViewport = typeof window !== 'undefined' && window.innerWidth < this.mobileBreakpoint;
  }

  private blurLoadMoreTrigger(event?: Event): void {
    const trigger = event?.currentTarget;
    if (trigger instanceof HTMLElement) {
      trigger.blur();
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}
