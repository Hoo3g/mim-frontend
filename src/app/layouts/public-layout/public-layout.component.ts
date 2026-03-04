import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from '../../presentation/layout/nav.component';

/**
 * Public layout wrapper — bọc Nav + RouterOutlet.
 * Tất cả public routes (research, recruitment, auth) đều nằm trong layout này.
 */
@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [NavComponent, RouterOutlet],
    template: `
    <app-nav />
    <main>
      <router-outlet />
    </main>
  `
})
export class PublicLayoutComponent { }
