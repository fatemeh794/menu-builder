import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-state">
      <span class="error-state__icon">⚠️</span>
      <p class="error-state__title">{{ title() }}</p>
      <button type="button" class="error-state__retry" (click)="retry.emit()">
        {{ 'common.retry' | translate }}
      </button>
    </div>
  `,
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  readonly title = input.required<string>();
  readonly retry = output<void>();
}
