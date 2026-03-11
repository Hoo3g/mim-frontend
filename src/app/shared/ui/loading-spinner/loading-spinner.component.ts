import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

/**
 * <app-loading-spinner />
 * HUS-branded loading indicator — consistent across all pages.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mim-loader"
         [class.mim-loader--compact]="compact()"
         [class.mim-loader--fullscreen]="fullscreen()">
      <div class="mim-loader__mark-wrap"
           [style.width.px]="size() * LOGO_RATIO"
           [style.height.px]="size()"
           aria-label="MIM logo loading">
        <svg class="mim-loader__svg"
             viewBox="0 0 296 152"
             fill="none"
             aria-hidden="true">
          <!-- MIM Logo Trefoil Knot (Continuous Stroke) -->
          <path class="mim-loader__stroke"
                pathLength="1"
                d="M 130 90 C 80 140, 20 100, 60 70 C 100 40, 130 70, 160 100 C 200 140, 280 140, 280 80 C 280 20, 180 20, 130 70 C 80 120, 60 40, 100 40 C 140 40, 150 70, 140 90 Z" />
        </svg>
      </div>
    </div>
  `,
  styles: [`
      .mim-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0;
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

      .mim-loader__mark-wrap {
        position: relative;
        display: block;
        overflow: hidden;
        user-select: none;
      }

      .mim-loader__svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }

      .mim-loader__stroke {
        fill: none;
        stroke: rgb(0 137 209);
        stroke-width: 3.7;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
        stroke-dasharray: 1;
        stroke-dashoffset: 1;
        animation: mim-logo-trace 1.9s ease-in-out infinite;
      }

      @keyframes mim-logo-trace {
        0% {
          stroke-dashoffset: 1;
        }

        48% {
          stroke-dashoffset: 0;
        }

        72% {
          stroke-dashoffset: 0;
        }

        100% {
          stroke-dashoffset: 1;
        }
      }

    `]
})
export class LoadingSpinnerComponent {
  readonly LOGO_RATIO = 296 / 152;
  size = input<number>(58);
  compact = input<boolean>(false);
  fullscreen = input<boolean>(false);
}
