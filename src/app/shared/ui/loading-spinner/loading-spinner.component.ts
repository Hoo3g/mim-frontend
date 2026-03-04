import { Component } from '@angular/core';

/**
 * <app-loading-spinner />
 * HUS-branded loading indicator — consistent across all pages.
 */
@Component({
    selector: 'app-loading-spinner',
    standalone: true,
    template: `
    <div class="py-20 flex justify-center">
      <div class="h-4 w-4 bg-hus-blue animate-pulse"></div>
    </div>
  `
})
export class LoadingSpinnerComponent { }
