import { Component, input } from '@angular/core';

export type BadgeVariant = 'blue' | 'gold' | 'gray' | 'outline' | 'red';

/**
 * <app-badge variant="blue" label="Giảng viên" />
 * Dùng cho: role indicator, research area, job type, status...
 */
@Component({
    selector: 'app-badge',
    standalone: true,
    template: `
    <span [class]="classes()">{{ label() }}</span>
  `
})
export class BadgeComponent {
    label = input.required<string>();
    variant = input<BadgeVariant>('gray');

    classes() {
        const base = 'inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-widest';
        const variants: Record<BadgeVariant, string> = {
            blue: `${base} bg-hus-blue text-white`,
            gold: `${base} bg-hus-gold text-white`,
            red: `${base} bg-hus-red text-white`,
            gray: `${base} bg-gray-100 text-gray-600`,
            outline: `${base} border border-gray-300 text-gray-500`,
        };
        return variants[this.variant()];
    }
}
