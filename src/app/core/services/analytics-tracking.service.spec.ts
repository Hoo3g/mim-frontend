import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AnalyticsTrackingService } from './analytics-tracking.service';
import { API_ENDPOINTS } from '../config/api-endpoints.config';

describe('AnalyticsTrackingService', () => {
    let service: AnalyticsTrackingService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AnalyticsTrackingService,
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        localStorage.removeItem('mim_analytics_visitor_id');

        service = TestBed.inject(AnalyticsTrackingService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        service.stop();
        httpMock.verify();
    });

    it('sends initial page-view and heartbeat events on start', () => {
        service.start();

        const pageViewReq = httpMock.expectOne(API_ENDPOINTS.ANALYTICS.TRACK_PAGE_VIEW);
        expect(pageViewReq.request.method).toBe('POST');
        expect(pageViewReq.request.body.path).toBe('/');
        expect(pageViewReq.request.body.routeKey).toBe('HOME');
        expect(pageViewReq.request.body.visitorId).toBeTruthy();
        pageViewReq.flush({ success: true, data: null, message: 'ok' });

        const heartbeatReq = httpMock.expectOne(API_ENDPOINTS.ANALYTICS.HEARTBEAT);
        expect(heartbeatReq.request.method).toBe('POST');
        expect(heartbeatReq.request.body.path).toBe('/');
        expect(heartbeatReq.request.body.routeKey).toBe('HOME');
        expect(heartbeatReq.request.body.visitorId).toBeTruthy();
        heartbeatReq.flush({ success: true, data: null, message: 'ok' });
    });
});
