import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'fa' | 'en';

const LANG_STORAGE_KEY = 'rm_lang';
const RTL_LANGUAGES: AppLanguage[] = ['fa'];

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly translate = inject(TranslateService);

  readonly currentLang = signal<AppLanguage>('fa');

  constructor() {
    this.translate.addLangs(['fa', 'en']);
    this.translate.setDefaultLang('fa');
  }

  init(): void {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as AppLanguage | null;
    this.setLanguage(stored ?? 'fa');
  }

  setLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);

    const isRtl = RTL_LANGUAGES.includes(lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  }

  toggle(): void {
    this.setLanguage(this.currentLang() === 'fa' ? 'en' : 'fa');
  }

  isRtl(): boolean {
    return RTL_LANGUAGES.includes(this.currentLang());
  }
}
