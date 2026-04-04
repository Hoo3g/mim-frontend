import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: cho phép route params tự bind vào input() signal
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        // Restore previous scroll position on browser back/forward while still scrolling to top on new pages.
        scrollPositionRestoration: 'enabled',
      }),
    ),
    // HTTP client với JWT interceptor và error handler
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ]
};
