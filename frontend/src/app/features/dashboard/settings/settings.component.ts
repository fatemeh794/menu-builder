import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { RestaurantSettings } from '../../../core/models';
import { DashboardApiService } from '../dashboard-api.service';

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class DashboardSettingsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardApiService);
  private readonly fb = inject(FormBuilder);
  private readonly restaurantSlug = this.route.snapshot.paramMap.get('restaurantSlug')!;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly settings = signal<RestaurantSettings | null>(null);

  private logoFile: File | null = null;
  private coverFile: File | null = null;

  readonly form = this.fb.group({
    name: [''],
    description: [''],
    theme_primary_color: ['#E63946'],
    theme_secondary_color: ['#1D3557'],
    theme_background_color: ['#FFFFFF'],
    theme_border_radius: [16],
  });

  constructor() {
    this.api.getSettings(this.restaurantSlug).subscribe((settings) => {
      this.settings.set(settings);
      this.form.patchValue(settings);
      this.loading.set(false);
    });
  }

  onLogoSelected(event: Event): void {
    this.logoFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onCoverSelected(event: Event): void {
    this.coverFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);

    const formData = new FormData();
    const value = this.form.getRawValue();
    formData.append('name', value.name ?? '');
    formData.append('description', value.description ?? '');
    formData.append('theme_primary_color', value.theme_primary_color ?? '#E63946');
    formData.append('theme_secondary_color', value.theme_secondary_color ?? '#1D3557');
    formData.append('theme_background_color', value.theme_background_color ?? '#FFFFFF');
    formData.append('theme_border_radius', String(value.theme_border_radius ?? 16));
    if (this.logoFile) formData.append('logo', this.logoFile);
    if (this.coverFile) formData.append('cover_image', this.coverFile);

    this.api.updateSettings(this.restaurantSlug, formData).subscribe((updated) => {
      this.settings.set(updated);
      this.saving.set(false);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    });
  }
}
