import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminAnalyticsService } from './admin-analytics.service';
import { API_ENDPOINTS } from '../config/api-endpoints.config';

describe('AdminAnalyticsService', () => {
    let service: AdminAnalyticsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AdminAnalyticsService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(AdminAnalyticsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('maps overview payload to frontend model', () => {
        let received: unknown;

        service.getOverview(12, 2).subscribe((result) => {
            received = result;
        });

        const request = httpMock.expectOne((req) =>
            req.url === API_ENDPOINTS.ADMIN.ANALYTICS_OVERVIEW
            && req.params.get('months') === '12'
            && req.params.get('onlineWindowMinutes') === '2'
        );
        expect(request.request.method).toBe('GET');

        request.flush({
            success: true,
            message: 'ok',
            data: {
                kpis: {
                    pageViews30d: 300,
                    onlineUsersNow: 12,
                    totalPosts: 44,
                    recruitmentPosts: 30
                },
                monthlyTraffic: [
                    {
                        monthKey: '2026-03',
                        monthLabel: '03/2026',
                        views: 100,
                        uniqueVisitors: 20
                    }
                ],
                topPages: [
                    {
                        routeKey: 'RESEARCH',
                        path: '/research',
                        views: 60,
                        uniqueVisitors: 18
                    }
                ],
                routeDistribution: [
                    {
                        routeKey: 'RESEARCH',
                        views: 120,
                        uniqueVisitors: 55
                    },
                    {
                        routeKey: 'RECRUITMENT',
                        views: 80,
                        uniqueVisitors: 40
                    }
                ],
                realtime: {
                    onlineUsersNow: 12,
                    onlineWindowMinutes: 2,
                    trackedVisitors24h: 88,
                    lastUpdatedAt: '2026-03-23T00:00:00Z'
                },
                monthOverMonthDelta: {
                    currentMonthViews: 100,
                    previousMonthViews: 80,
                    viewsChangePercent: 25,
                    currentMonthUniqueVisitors: 20,
                    previousMonthUniqueVisitors: 15,
                    uniqueVisitorsChangePercent: 33.3
                }
            }
        });

        const overview = received as {
            kpis: { pageViews30d: number; totalPosts: number };
            realtime: { lastUpdatedAt: Date; trackedVisitors24h: number };
            topPages: Array<{ path: string }>;
            routeDistribution: Array<{ routeKey: string; views: number }>;
        };

        expect(overview.kpis.pageViews30d).toBe(300);
        expect(overview.kpis.totalPosts).toBe(44);
        expect(overview.realtime.trackedVisitors24h).toBe(88);
        expect(overview.realtime.lastUpdatedAt instanceof Date).toBe(true);
        expect(overview.topPages[0].path).toBe('/research');
        expect(overview.routeDistribution[0].routeKey).toBe('RESEARCH');
        expect(overview.routeDistribution[0].views).toBe(120);
    });
});
