import { Component, input, output } from '@angular/core';

export interface FilterOption {
    label: string;
    value: string;
}

/**
 * <app-filter-bar [options]="opts" [active]="current" (changed)="setFilter($event)" />
 * Pattern filter button group dùng chung — thay thế code lặp ở research và posts.
 */
@Component({
    selector: 'app-filter-bar',
    standalone: true,
    template: `
    <div class="flex border border-gray-200">
      @for (opt of options(); track opt.value; let first = $first) {
        <button
          (click)="changed.emit(opt.value)"
          [class]="btnClass(opt.value, first)"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `
})
export class FilterBarComponent {
    options = input.required<FilterOption[]>();
    active = input.required<string>();
    changed = output<string>();

    btnClass(value: string, isFirst: boolean): string {
        const base = 'px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all';
        const border = isFirst ? '' : 'border-l border-gray-200';
        const active = value === this.active()
            ? 'bg-hus-blue text-white'
            : 'text-gray-400 hover:text-gray-700 bg-white';
        return `${base} ${border} ${active}`;
    }
}
