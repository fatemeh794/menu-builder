import { Pipe, PipeTransform } from '@angular/core';

const FORMATTER = new Intl.NumberFormat('en-US');

/** Formats an integer Toman amount with thousands separators, e.g.
 * 120000 -> "120,000". The "تومان"/"Toman" suffix is added by the
 * caller via translation so it stays language-aware. */
@Pipe({ name: 'tomanPrice', standalone: true })
export class TomanPricePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    return FORMATTER.format(value);
  }
}
