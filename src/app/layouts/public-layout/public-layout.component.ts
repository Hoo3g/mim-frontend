import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Public layout wrapper — bọc Nav + RouterOutlet.
 * Tất cả public routes (research, recruitment, auth) đều nằm trong layout này.
 */
@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [RouterOutlet],
  template: `
    <main [style.paddingTop]="'var(--app-nav-offset, 92px)'">
      <router-outlet />
    </main>
  `
})
export class PublicLayoutComponent { }
