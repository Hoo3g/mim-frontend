import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AnalyticsTrackingService } from './analytics-tracking.service';
import { API_ENDPOINTS } from '../config/api-endpoints.config';

@Component({
    standalone: true,
    template: ''
})
class DummyPageComponent {}

describe('AnalyticsTrackingService', () => {
    let service: AnalyticsTrackingService;
    let httpMock: HttpTestingController;
    let router: Router;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AnalyticsTrackingService,
                provideRouter(
                    [
                        { path: '', component: DummyPageComponent },
                        { path: 'admin', component: DummyPageComponent },
                        { path: 'news', component: DummyPageComponent },
                        { path: 'auth/callback', component: DummyPageComponent }
                    ],
                    withDisabledInitialNavigation()
                ),
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        localStorage.removeItem('mim_analytics_visitor_id');
        localStorage.removeItem('mim_analytics_page_view_tracked_scope');
        localStorage.removeItem('mim_auth_session_id');
        localStorage.removeItem('mim_auth_session_user_id');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        service = TestBed.inject(AnalyticsTrackingService);
        httpMock = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        service.stop();
        httpMock.verify();
    });

    it('tracks only one page-view on first eligible page in app session', fakeAsync(() => {
        service.start();

        const initialPageViewReq = httpMock.expectOne(API_ENDPOINTS.ANALYTICS.TRACK_PAGE_VIEW);
        expect(initialPageViewReq.request.method).toBe('POST');
        expect(initialPageViewReq.request.body.path).toBe('/');
        expect(initialPageViewReq.request.body.routeKey).toBe('HOME');
        expect(initialPageViewReq.request.body.visitorId).toBeTruthy();
        initialPageViewReq.flush({ success: true, data: null, message: 'ok' });

        const heartbeatReq = httpMock.expectOne(API_ENDPOINTS.ANALYTICS.HEARTBEAT);
        expect(heartbeatReq.request.method).toBe('POST');
        expect(heartbeatReq.request.body.path).toBe('/');
        expect(heartbeatReq.request.body.routeKey).toBe('HOME');
        expect(heartbeatReq.request.body.visitorId).toBeTruthy();
        heartbeatReq.flush({ success: true, data: null, message: 'ok' });

        router.navigateByUrl('/admin');
        tick();
        httpMock.expectNone(API_ENDPOINTS.ANALYTICS.TRACK_PAGE_VIEW);
    }));

    it('skips auth path and tracks first eligible path after auth', fakeAsync(() => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/auth/callback');

        service.start();
        httpMock.expectNone(API_ENDPOINTS.ANALYTICS.TRACK_PAGE_VIEW);
        httpMock.expectOne(API_ENDPOINTS.ANALYTICS.HEARTBEAT).flush({ success: true, data: null, message: 'ok' });

        router.navigateByUrl('/admin');
        tick();
        const firstPageViewReq = httpMock.expectOne(API_ENDPOINTS.ANALYTICS.TRACK_PAGE_VIEW);
        expect(firstPageViewReq.request.body.path).toBe('/admin');
        firstPageViewReq.flush({ success: true, data: null, message: 'ok' });

        router.navigateByUrl('/news');
        tick();
        httpMock.expectNone(API_ENDPOINTS.ANALYTICS.TRACK_PAGE_VIEW);
    }));
});
