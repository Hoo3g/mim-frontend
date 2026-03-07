import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostService } from '../../core/services/post.service';
import { Post } from '../../core/models/post.model';
import { Observable, BehaviorSubject, combineLatest, map, startWith } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PostDetailComponent } from './post-detail.component';
import { SpecializationService } from '../../core/services/specialization.service';
import { ResearchCategory } from '../../core/models/research-category.model';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, PostDetailComponent],
  template: `
    <div class="bg-white min-h-screen">
      
      <!-- Minimal Header - Brand Accented -->
      <div class="border-b border-gray-100 bg-blue-50/10 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-1 flex items-center gap-2">
             <span class="w-1 h-6 bg-hus-blue"></span>
             Tuyển dụng & Sự nghiệp
          </h1>
          <p class="text-[10px] font-bold text-hus-blue uppercase tracking-widest pl-3">
            Kết nối sinh viên MIM với cơ hội nghề nghiệp
          </p>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="flex flex-col lg:flex-row gap-10">
          
          <!-- LEFT: Sidebar (Filters & Search) -->
          <div class="lg:w-64 flex-shrink-0">
            <div class="sticky top-24 space-y-8">
              
              <!-- Search -->
              <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Tìm kiếm</h3>
                <div class="relative">
                  <input type="text" 
                         [ngModel]="searchTerm"
                         (ngModelChange)="onSearchChange($event)"
                         placeholder="Tên công việc, vị trí..."
                         class="w-full bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:ring-1 focus:ring-hus-blue focus:border-hus-blue outline-none transition-all font-medium">
                </div>
              </section>

              <!-- Filter by Type -->
              <section>
                <h3 class="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4">Phân loại</h3>
                <div class="space-y-4">
                  <!-- Main Category: COMPANY -->
                  <div>
                    <button (click)="setFilter('COMPANY')" 
                            [class.text-hus-blue]="filterType === 'COMPANY'"
                            [class.bg-blue-50]="filterType === 'COMPANY'"
                            class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex justify-between items-center group">
                      Doanh nghiệp
                      <span *ngIf="filterType === 'COMPANY'" class="w-1 h-1 bg-hus-blue"></span>
                    </button>
                    <!-- Sub-filters for COMPANY -->
                    <div *ngIf="filterType === 'COMPANY'" class="mt-2 ml-3 space-y-1 border-l border-gray-100 pl-3">
                      <button (click)="setSubFilter('ALL')" 
                              [class.text-hus-blue]="subFilter === 'ALL'"
                              class="block w-full text-left py-1 text-[10px] font-bold uppercase tracking-wider hover:text-hus-blue transition-colors">
                        ▪ Tất cả
                      </button>
                      <button *ngFor="let specialization of specializations"
                              (click)="setSubFilter(specialization.name)" 
                              [class.text-hus-blue]="subFilter === specialization.name"
                              class="block w-full text-left py-1 text-[10px] font-bold uppercase tracking-wider hover:text-hus-blue transition-colors">
                        ▪ {{ specialization.name }}
                      </button>
                    </div>
                  </div>

                  <!-- Main Category: STUDENT -->
                  <div>
                    <button (click)="setFilter('STUDENT')" 
                            [class.text-hus-blue]="filterType === 'STUDENT'"
                            [class.bg-blue-50]="filterType === 'STUDENT'"
                            class="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors flex justify-between items-center group">
                      Sinh viên
                      <span *ngIf="filterType === 'STUDENT'" class="w-1 h-1 bg-hus-blue"></span>
                    </button>
                    <!-- Sub-filters for STUDENT -->
                    <div *ngIf="filterType === 'STUDENT'" class="mt-2 ml-3 space-y-1 border-l border-gray-100 pl-3">
                      <button (click)="setSubFilter('ALL')" 
                              [class.text-hus-blue]="subFilter === 'ALL'"
                              class="block w-full text-left py-1 text-[10px] font-bold uppercase tracking-wider hover:text-hus-blue transition-colors">
                        ▪ Tất cả
                      </button>
                      <button *ngFor="let specialization of specializations"
                              (click)="setSubFilter(specialization.name)" 
                              [class.text-hus-blue]="subFilter === specialization.name"
                              class="block w-full text-left py-1 text-[10px] font-bold uppercase tracking-wider hover:text-hus-blue transition-colors">
                        ▪ {{ specialization.name }}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Quick Links -->
              <section class="pt-8 border-t border-gray-100">
                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Liên kết</h3>
                <ul class="text-[10px] space-y-2 font-bold text-gray-400 uppercase tracking-tighter">
                  <li><a href="#" class="hover:text-hus-blue transition underline underline-offset-2">Mẫu CV Sinh viên</a></li>
                  <li><a href="#" class="hover:text-hus-blue transition underline underline-offset-2">Cẩm nang phỏng vấn</a></li>
                </ul>
              </section>
            </div>
          </div>

          <!-- RIGHT: Main Content (Compact Cards) -->
          <div class="flex-grow">
            <div *ngIf="filteredPosts$ | async as posts; else loading">
              <div *ngIf="posts.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
                Không tìm thấy thông tin phù hợp.
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div *ngFor="let post of posts" 
                     (click)="openDetail(post)"
                     class="bg-white border border-gray-100 p-6 hover:border-hus-blue hover:shadow-lg transition-all duration-300 group flex flex-col h-full relative cursor-pointer">
                  
                  <!-- Author Identity Section - Refined -->
                  <div class="flex items-start justify-between mb-6">
                    <div class="flex items-center gap-4">
                      <!-- Avatar with subtle status ring -->
                      <div class="relative">
                        <div class="w-11 h-11 flex-shrink-0 bg-white border-2 border-gray-50 shadow-sm overflow-hidden group-hover:border-hus-blue/20 transition-all duration-500 transform group-hover:scale-105">
                          <img *ngIf="post.authorAvatarUrl" [src]="post.authorAvatarUrl" [alt]="post.authorName" class="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all">
                          <div *ngIf="!post.authorAvatarUrl" class="w-full h-full flex items-center justify-center bg-gray-50 text-[12px] font-black text-hus-blue/40 uppercase">
                            {{ post.authorName.charAt(0) }}
                          </div>
                        </div>
                        <!-- Status Accent -->
                        <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white flex items-center justify-center border border-gray-50 shadow-sm">
                           <div class="w-1.5 h-1.5" [ngClass]="post.postType.includes('COMPANY') ? 'bg-hus-blue animate-pulse' : 'bg-green-500'"></div>
                        </div>
                      </div>
                      
                      <div class="flex flex-col">
                        <div class="text-[13px] font-black text-gray-900 leading-tight mb-0.5 group-hover:text-hus-blue transition-colors">
                          {{ post.authorName }}
                        </div>
                        <div class="flex items-center gap-2">
                          <span [ngClass]="{
                            'text-hus-blue bg-blue-50/50': post.postType.includes('COMPANY'),
                            'text-gray-500 bg-gray-50': !post.postType.includes('COMPANY')
                          }" class="text-[7.5px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5">
                            {{ post.postType.includes('COMPANY') ? 'Đối tác doanh nghiệp' : 'Ứng viên tiềm năng' }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                       <span class="text-[9px] font-bold text-gray-300 uppercase tabular-nums">{{ post.createdAt | date:'dd.MM.yyyy' }}</span>
                       <div class="w-4 h-0.5 bg-gray-100 group-hover:bg-hus-blue/30 transition-colors"></div>
                    </div>
                  </div>

                  <h3 class="text-base font-bold text-gray-900 mb-2 leading-tight group-hover:translate-x-1 transition-all duration-300 line-clamp-2 min-h-[2.5rem]">
                    {{ post.title }}
                  </h3>
                  
                  <p class="text-[11px] text-gray-500 font-light leading-relaxed mb-4 line-clamp-2">{{ post.description }}</p>

                  <div class="space-y-4 mb-2 flex-grow">
                    <!-- Achievements (for Students) -->
                    <div *ngIf="post.achievements" class="pt-3 border-t border-gray-50">
                      <h4 class="text-[8px] font-bold text-hus-blue uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span class="w-1 h-1 bg-hus-blue"></span>
                        Thành tích nổi bật
                      </h4>
                      <ul class="text-[10px] text-gray-600 space-y-1">
                        <li *ngFor="let item of post.achievements.split(';')" class="flex items-start gap-2">
                          <span class="text-hus-blue mt-0.5 text-[8px]">•</span>
                          <span class="font-medium leading-tight line-clamp-2">{{ item.trim() }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Requirements (for Companies) -->
                    <div *ngIf="post.postType.includes('COMPANY') && post.requirements" class="pt-3 border-t border-gray-50">
                      <h4 class="text-[8px] font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span class="w-1 h-1 bg-gray-900"></span>
                        Yêu cầu công việc
                      </h4>
                      <p class="text-[10px] text-gray-600 leading-relaxed font-medium line-clamp-3">
                        {{ post.requirements }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-hus-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{{ post.location }}</span>
                      </div>
                      <div *ngIf="post.salaryRange" class="flex items-center gap-1 text-[9px] font-bold text-hus-blue uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ post.salaryRange }}</span>
                      </div>
                    </div>
                    <div class="text-[8px] font-black text-gray-200 uppercase tracking-widest group-hover:text-hus-blue transition-colors">Chi tiết</div>
                  </div>

                </div>
              </div>
            </div>

            <ng-template #loading>
               <div class="py-20 flex justify-center">
                 <div class="h-4 w-4 bg-hus-blue animate-pulse"></div>
               </div>
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
  private postService = inject(PostService);
  private specializationService = inject(SpecializationService);

  private readonly specializationAliasMap: Record<string, string[]> = {
    'tri tue nhan tao': ['ai', 'artificial intelligence'],
    'khoa hoc du lieu': ['khdl', 'data science'],
    'khoa hoc may tinh': ['khmt', 'computer science'],
    'toan kinh te': ['tkt', 'actuary'],
    'an ninh mang': ['cybersecurity', 'security']
  };

  searchTerm = '';
  filterTypeSelected$ = new BehaviorSubject<'COMPANY' | 'STUDENT'>('COMPANY');
  subFilterSelected$ = new BehaviorSubject<string>('ALL');
  specializations: ResearchCategory[] = [];

  filteredPosts$!: Observable<Post[]>;
  filterType: 'COMPANY' | 'STUDENT' = 'COMPANY';
  subFilter: string = 'ALL';
  selectedPost: Post | null = null;

  ngOnInit(): void {
    this.loadSpecializations();

    this.filteredPosts$ = combineLatest([
      this.postService.getPosts(),
      this.filterTypeSelected$,
      this.subFilterSelected$
    ]).pipe(
      map(([posts, type, sub]) => {
        const filtered = posts.filter(post => {
          const term = this.searchTerm.toLowerCase();
          const matchesSearch = !term ||
            post.title.toLowerCase().includes(term) ||
            post.description.toLowerCase().includes(term);

          const matchesType = (type === 'COMPANY' && post.postType.includes('COMPANY')) ||
            (type === 'STUDENT' && !post.postType.includes('COMPANY'));

          let matchesSub = true;
          if (sub !== 'ALL') {
            matchesSub = this.matchesSpecialization(post, sub);
          }

          return matchesSearch && matchesType && matchesSub;
        });
        return filtered;
      })
    );
  }

  onSearchChange(val: string): void {
    this.searchTerm = val;
    this.filterTypeSelected$.next(this.filterType); // Trigger re-filter
  }

  setFilter(type: 'COMPANY' | 'STUDENT'): void {
    this.filterType = type;
    this.subFilter = 'ALL';
    this.filterTypeSelected$.next(type);
    this.subFilterSelected$.next('ALL');
  }

  setSubFilter(sub: string): void {
    this.subFilter = sub;
    this.subFilterSelected$.next(sub);
  }

  openDetail(post: Post): void {
    this.selectedPost = post;
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  }

  closeDetail(): void {
    this.selectedPost = null;
    document.body.style.overflow = 'auto';
  }

  private loadSpecializations(): void {
    this.specializationService.getActiveSpecializations().subscribe((items) => {
      this.specializations = items;
    });
  }

  private matchesSpecialization(post: Post, specializationName: string): boolean {
    const tags = (post.tags ?? [])
      .map((item) => this.normalize(item))
      .filter((item) => !!item);
    if (tags.length === 0) {
      return false;
    }

    const normalizedSpecialization = this.normalize(specializationName);
    const aliases = this.specializationAliasMap[normalizedSpecialization] ?? [];
    const candidates = [normalizedSpecialization, ...aliases.map((item) => this.normalize(item))]
      .filter((item, index, arr) => !!item && arr.indexOf(item) === index);

    return tags.some((tag) =>
      candidates.some((candidate) =>
        tag === candidate || tag.includes(candidate) || candidate.includes(tag)));
  }

  private normalize(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }
}
