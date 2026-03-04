import { Component, input } from '@angular/core';

/**
 * <app-section-header title="Cổng nghiên cứu" [count]="42" />
 * Tiêu đề section với indicator bar xanh — dùng thống nhất cho mọi section header.
 */
@Component({
    selector: 'app-section-header',
    standalone: true,
    template: `
    <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
      <span class="w-1 h-4 bg-hus-blue flex-shrink-0"></span>
      {{ title() }}
      @if (count() !== null) {
        <span class="ml-1 text-[10px] font-medium text-gray-400">({{ count() }})</span>
      }
    </h2>
  `
})
export class SectionHeaderComponent {
    title = input.required<string>();
    count = input<number | null>(null);
}
