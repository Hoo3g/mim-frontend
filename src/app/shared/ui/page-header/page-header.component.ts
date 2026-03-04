import { Component, input } from '@angular/core';

/**
 * <app-page-header title="Nghiên cứu" subtitle="Mô tả..." imageUrl="assets/..." />
 * Hero banner đầu mỗi page — nhất quán layout và spacing.
 */
@Component({
    selector: 'app-page-header',
    standalone: true,
    template: `
    <div class="bg-gray-50 border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div class="relative overflow-hidden border-2 border-hus-blue/10 bg-white">
          <div [class]="imageUrl() ? 'grid grid-cols-1 md:grid-cols-2 items-center' : ''">
            <div class="p-8 md:p-12">
              <h1 class="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4 uppercase tracking-tighter">
                {{ title() }}
              </h1>
              @if (subtitle()) {
                <p class="text-sm text-gray-400 font-bold uppercase tracking-widest max-w-sm mb-8">
                  {{ subtitle() }}
                </p>
              }
              <ng-content />
            </div>
            @if (imageUrl()) {
              <div class="h-64 md:h-full relative overflow-hidden bg-gray-100">
                <img [src]="imageUrl()" [alt]="title()"
                     class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class PageHeaderComponent {
    title = input.required<string>();
    subtitle = input<string>('');
    imageUrl = input<string>('');
}
