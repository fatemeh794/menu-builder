import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MembershipRole, RestaurantMembership } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DashboardApiService } from '../dashboard-api.service';

@Component({
  selector: 'app-dashboard-staff',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, TranslateModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss',
})
export class DashboardStaffComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardApiService);
  private readonly fb = inject(FormBuilder);
  private readonly restaurantSlug = this.route.snapshot.paramMap.get('restaurantSlug')!;

  readonly staff = signal<RestaurantMembership[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly roles: MembershipRole[] = ['OWNER', 'MANAGER', 'STAFF'];

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    first_name: [''],
    last_name: [''],
    password: [''],
    role: ['STAFF' as MembershipRole, Validators.required],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.getStaff(this.restaurantSlug).subscribe((response) => {
      this.staff.set(response.results);
      this.loading.set(false);
    });
  }

  invite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    const value = this.form.getRawValue();
    this.api
      .inviteStaff(this.restaurantSlug, {
        email: value.email!,
        first_name: value.first_name ?? '',
        last_name: value.last_name ?? '',
        password: value.password ?? '',
        role: value.role!,
      })
      .subscribe({
        next: (membership) => {
          this.staff.set([...this.staff(), membership]);
          this.form.reset({ role: 'STAFF' });
        },
        error: () => this.error.set('dashboard.staff.invite_error'),
      });
  }

  remove(membership: RestaurantMembership): void {
    this.api.removeStaff(this.restaurantSlug, membership.id).subscribe(() => {
      this.staff.set(this.staff().filter((m) => m.id !== membership.id));
    });
  }
}
