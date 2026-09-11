import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  APP_INITIALIZER,
  importProvidersFrom,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { TranslationService } from './core/services/translation.service';

// Cache-busted so a deployed translation update is never masked by a
// browser's HTTP cache - these JSON files carry no content hash the way
// Angular's own JS/CSS bundles do, and without this, a client whose cache
// already holds an old copy can keep seeing it for that copy's entire
// heuristic freshness window (nginx's Cache-Control header alone only
// protects requests made *after* the header started being sent, not
// entries a client cached before that).
const BUILD_STAMP = Date.now();

function httpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', `.json?v=${BUILD_STAMP}`);
}

function initTranslations(translationService: TranslationService) {
  return () => translationService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'fa',
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initTranslations,
      deps: [TranslationService],
      multi: true,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
