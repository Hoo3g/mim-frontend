import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="bg-white">
      <div class="relative isolate px-6 pt-14 lg:px-8">
        <div class="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
          <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Kết nối tri thức, Kiến tạo tương lai
          </h1>
          <p class="mt-6 text-lg leading-8 text-gray-600">
            Cổng thông tin hỗ trợ sinh viên tìm kiếm cơ hội thực tập, việc làm và tổng hợp các công trình nghiên cứu khoa học tiêu biểu.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <a routerLink="/posts" class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Tìm việc làm</a>
            <a routerLink="/research" class="text-sm font-semibold leading-6 text-gray-900">Xem nghiên cứu khoa học <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent { }
