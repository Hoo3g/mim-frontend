import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { authSignal } from './core/signals/auth.signal';
import { Role } from './core/enums/role.enum';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <router-outlet></router-outlet>
      <footer class="bg-white border-t border-gray-100 py-12 mt-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          &copy; 2024 MIM Portal. Tri thức là sức mạnh.
        </div>
      </footer>
    </div>
  `
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    // Mock login state for development/demo
    authSignal.setAuth({
      id: 'admin-1',
      email: 'admin@mim.hus.edu.vn',
      fullName: 'Nguyễn Hồng Minh',
      role: Role.ADMIN
    }, 'mock-jwt-token');

    console.log('AppComponent: Mock Auth initialized');
  }
}
