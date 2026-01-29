import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="min-h-screen bg-gray-50/50">
      <!-- Admin Header -->
      <div class="bg-gray-900 text-white py-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-end">
            <div>
              <h1 class="text-3xl font-black uppercase tracking-tighter mb-2">QUẢN TRỊ VIÊN</h1>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hệ thống quản lý nội dung & người dùng MIM</p>
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

      <!-- Main Navigation Tabs -->
      <div class="border-b border-gray-200 bg-white sticky top-16 z-10 transition-all">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex gap-8">
            <button (click)="currentTab = 'POSTS'" 
                    [class.border-hus-blue]="currentTab === 'POSTS'"
                    [class.text-hus-blue]="currentTab === 'POSTS'"
                    class="py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
              Tin Tuyển dụng ({{ pendingPosts.length }})
            </button>
            <button (click)="currentTab = 'PAPERS'" 
                    [class.border-hus-blue]="currentTab === 'PAPERS'"
                    [class.text-hus-blue]="currentTab === 'PAPERS'"
                    class="py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
              Bài báo khoa học ({{ pendingPapers.length }})
            </button>
            <button (click)="currentTab = 'USERS'" 
                    [class.border-hus-blue]="currentTab === 'USERS'"
                    [class.text-hus-blue]="currentTab === 'USERS'"
                    class="py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent transition-all">
              Yêu cầu Tài khoản
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <!-- Tab: POSTS -->
        <div *ngIf="currentTab === 'POSTS'" class="space-y-4">
          <div *ngFor="let post of pendingPosts" class="bg-white border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-hus-blue transition-all">
            <div class="flex-grow">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[9px] font-black bg-gray-100 px-2 py-0.5 uppercase tracking-widest">{{ post.authorName }} (SV)</span>
                <span class="text-[9px] text-gray-400 uppercase tabular-nums">{{ post.date }}</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 group-hover:text-hus-blue transition-colors">{{ post.title }}</h3>
              <p class="text-[11px] text-gray-500 line-clamp-1 mt-1">{{ post.summary }}</p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
              <button (click)="approveContent('POST', post.id)" class="px-6 py-2 bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-hus-dark transition-all">Duyệt</button>
              <button (click)="rejectContent('POST', post.id)" class="px-6 py-2 bg-white border border-red-200 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Từ chối</button>
            </div>
          </div>
          <div *ngIf="pendingPosts.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
            Không có bài đăng nào đang chờ duyệt.
          </div>
        </div>

        <!-- Tab: PAPERS -->
        <div *ngIf="currentTab === 'PAPERS'" class="space-y-4">
           <div *ngFor="let paper of pendingPapers" class="bg-white border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-hus-blue transition-all">
            <div class="flex-grow">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[9px] font-black bg-blue-50 text-hus-blue px-2 py-0.5 uppercase tracking-widest">{{ paper.authorName }} (SV)</span>
                <span class="text-[9px] text-gray-400 uppercase tabular-nums">{{ paper.category }}</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 group-hover:text-hus-blue transition-colors">{{ paper.title }}</h3>
            </div>
            <div class="flex gap-3 flex-shrink-0">
              <button (click)="approveContent('PAPER', paper.id)" class="px-6 py-2 bg-hus-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-hus-dark transition-all">Duyệt</button>
              <button (click)="rejectContent('PAPER', paper.id)" class="px-6 py-2 bg-white border border-red-200 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Từ chối</button>
            </div>
          </div>
          <div *ngIf="pendingPapers.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-200">
            Không có bài nghiên cứu nào đang chờ duyệt.
          </div>
        </div>

        <!-- Tab: USERS -->
        <div *ngIf="currentTab === 'USERS'" class="bg-white border border-gray-100 overflow-hidden">
          <table class="w-full text-left text-[11px]">
            <thead class="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-widest font-black">
              <tr>
                <th class="px-6 py-4 font-black">Người đăng ký</th>
                <th class="px-6 py-4 font-black">Loại</th>
                <th class="px-6 py-4 font-black">Thông tin liên hệ</th>
                <th class="px-6 py-4 font-black text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr *ngFor="let user of pendingUsers" class="hover:bg-gray-50/50 transition-colors group">
                <td class="px-6 py-4 font-bold text-gray-900 uppercase tracking-tighter">{{ user.name }}</td>
                <td class="px-6 py-4">
                  <span [class.text-hus-blue]="user.type === 'COMPANY'"
                        [class.text-purple-600]="user.type === 'LECTURER'"
                        class="font-bold uppercase tracking-widest">{{ user.type }}</span>
                </td>
                <td class="px-6 py-4 text-gray-500 font-medium">{{ user.email }}</td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button class="text-hus-blue font-black uppercase tracking-widest hover:underline">Phê duyệt</button>
                  <button class="text-red-400 font-black uppercase tracking-widest hover:underline">Hủy</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="pendingUsers.length === 0" class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest">
            Không có yêu cầu tài khoản mới.
          </div>
        </div>

      </div>
    </div>
  `,
    styles: []
})
export class AdminDashboardComponent implements OnInit {
    currentTab: 'POSTS' | 'PAPERS' | 'USERS' = 'POSTS';

    // Mock data for demonstration
    pendingPosts = [
        { id: '1', title: 'Thực tập sinh Java - Sinh viên năm 3', authorName: 'Nguyễn Văn A', date: '29.01.2024', summary: 'Em muốn tìm vị trí thực tập để học hỏi thêm về Spring Boot...' },
        { id: '2', title: 'Cần tìm việc Part-time nhập liệu', authorName: 'Trần Thị B', date: '28.01.2024', summary: 'Có thể làm việc vào các buổi sáng trong tuần...' }
    ];

    pendingPapers = [
        { id: 'p1', title: 'Ứng dụng AI trong dự báo thời tiết tại Việt Nam', authorName: 'Lê Văn C', category: 'Sinh viên Nghiên cứu' }
    ];

    pendingUsers = [
        { id: 'u1', name: 'Tập đoàn Viettel', type: 'COMPANY', email: 'hr@viettel.vn' },
        { id: 'u2', name: 'TS. Nguyễn Hữu Dũng', type: 'LECTURER', email: 'dung.nh@hus.edu.vn' }
    ];

    ngOnInit(): void { }

    approveContent(type: string, id: string) {
        console.log(`Approving ${type}: ${id}`);
        if (type === 'POST') this.pendingPosts = this.pendingPosts.filter(p => p.id !== id);
        if (type === 'PAPER') this.pendingPapers = this.pendingPapers.filter(p => p.id !== id);
    }

    rejectContent(type: string, id: string) {
        console.log(`Rejecting ${type}: ${id}`);
        if (type === 'POST') this.pendingPosts = this.pendingPosts.filter(p => p.id !== id);
        if (type === 'PAPER') this.pendingPapers = this.pendingPapers.filter(p => p.id !== id);
    }
}
