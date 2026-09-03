import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-menu-grid-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-grid">
      @for (i of [1, 2, 3, 4, 5, 6]; track i) {
        <div class="skeleton-card">
          <div class="skeleton-card__image"></div>
          <div class="skeleton-card__line skeleton-card__line--title"></div>
          <div class="skeleton-card__line skeleton-card__line--price"></div>
        </div>
      }
    </div>
  `,
  styleUrl: './menu-grid-skeleton.component.scss',
})
export class MenuGridSkeletonComponent {}
