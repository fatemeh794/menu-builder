import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <span class="empty-state__icon">{{ icon() }}</span>
      <p class="empty-state__title">{{ title() }}</p>
      @if (hint()) {
        <span class="empty-state__hint">{{ hint() }}</span>
      }
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input('🍽️');
  readonly title = input.required<string>();
  readonly hint = input<string>('');
}
