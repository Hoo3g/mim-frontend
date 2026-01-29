import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="bg-white border-b border-gray-200 font-sans sticky top-0 z-50">
      <!-- Top Bar: Brand Accented -->
      <div class="bg-hus-blue text-white text-[10px] uppercase tracking-widest py-1.5 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto flex justify-between items-center font-bold">
          <div class="flex space-x-6">
            <span>(+84) 24 38 58 11 35</span>
            <span class="hidden sm:inline">office&#64;mim.hus.edu.vn</span>
          </div>
          <div class="space-x-4">
            <a href="#" class="hover:text-hus-dark transition">TRANG CHỦ HUS</a>
            <span class="opacity-30">|</span>
            <a href="#" class="hover:text-hus-dark transition">CÁN BỘ</a>
          </div>
        </div>
      </div>

      <!-- Main Navbar -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo Section -->
          <a routerLink="/" class="flex items-center gap-3 group">
            <img src="assets/logo.png" alt="Logo" class="h-10 w-auto transition-transform group-hover:scale-110">
            <div class="flex flex-col border-l-2 border-hus-blue pl-3">
              <span class="text-gray-900 font-bold text-sm uppercase tracking-tighter leading-none group-hover:text-hus-blue transition-colors">Khoa Toán - Cơ - Tin học</span>
              <span class="text-hus-blue text-[9px] uppercase tracking-tight font-black mt-0.5">Faculty of Mathematics - Mechanics - Informatics</span>
            </div>
          </a>

          <!-- Navigation Links -->
          <div class="hidden md:flex space-x-6 h-full items-center">
            <a routerLink="/" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              NGHIÊN CỨU
            </a>
            <a routerLink="/recruitment" routerLinkActive="text-hus-blue border-hus-blue" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              TUYỂN DỤNG
            </a>
            <a href="#" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              ĐÀO TẠO
            </a>
            <a href="#" class="text-gray-500 hover:text-hus-blue font-bold text-[11px] uppercase tracking-widest h-full flex items-center border-b-[3px] border-transparent transition-all">
              TIN TỨC
            </a>
          </div>
        </div>
      </div>
    </header>
  `
})
export class NavComponent { }
