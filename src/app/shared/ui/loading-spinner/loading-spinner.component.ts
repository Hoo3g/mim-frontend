import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

/**
 * <app-loading-spinner />
 * Shared blue circular loading indicator.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mim-loader"
         [class.mim-loader--compact]="compact()"
         [class.mim-loader--fullscreen]="fullscreen()">
      <span class="mim-loader__ring"
            [style.width.px]="size()"
            [style.height.px]="size()"
            aria-label="Loading">
      </span>
    </div>
  `,
  styles: [`
      .mim-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3rem 0;
      }

      .mim-loader--compact {
        padding: 1rem 0;
      }

      .mim-loader--fullscreen {
        position: fixed;
        inset: 0;
        z-index: 80;
        padding: 0;
        background: rgb(255 255 255 / 0.84);
        pointer-events: auto;
      }

      .mim-loader__ring {
        display: inline-block;
        box-sizing: border-box;
        border-radius: 9999px;
        background: transparent;
        box-shadow: none;
        filter: none;
        border: 3px solid rgb(0 137 209 / 0.14);
        border-top-color: rgb(0 137 209);
        border-right-color: rgb(0 137 209 / 0.2);
        animation: mim-loader-spin 0.72s linear infinite;
        will-change: transform;
      }

      @keyframes mim-loader-spin {
        0% {
          transform: rotate(0deg);
        }

        100% {
          transform: rotate(360deg);
        }
      }
    `]
})
export class LoadingSpinnerComponent {
  size = input<number>(58);
  compact = input<boolean>(false);
  fullscreen = input<boolean>(false);
}
