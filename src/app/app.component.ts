import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './presentation/layout/nav.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, NavComponent],
    template: `
    <div class="min-h-screen bg-gray-50">
      <app-nav></app-nav>
      <main>
        <router-outlet></router-outlet>
      </main>
      <footer class="bg-white border-t border-gray-100 py-12 mt-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          &copy; 2024 MIM Portal. Tri thức là sức mạnh.
        </div>
      </footer>
    </div>
  `
})
export class AppComponent { }
