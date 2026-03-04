import { Component, input } from '@angular/core';

/**
 * <app-empty-state message="Không tìm thấy kết quả" />
 */
@Component({
    selector: 'app-empty-state',
    standalone: true,
    template: `
    <div class="py-20 text-center text-gray-400 text-xs uppercase tracking-widest border-2 border-dashed border-gray-100">
      {{ message() }}
    </div>
  `
})
export class EmptyStateComponent {
    message = input<string>('Không có dữ liệu.');
}
