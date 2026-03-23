import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import {
    AdminAnalyticsOverview,
    AdminMonthlyTrafficPoint,
    AdminRouteDistributionItem,
    AdminTopPageItem
} from '../models/admin-analytics.model';
import { parseDate, unwrap } from '../utils/api-response.util';

interface AdminAnalyticsOverviewApiModel {
    kpis?: {
        pageViews30d?: number;
        onlineUsersNow?: number;
        totalPosts?: number;
        recruitmentPosts?: number;
    };
    monthlyTraffic?: Array<{
        monthKey?: string;
        monthLabel?: string;
        views?: number;
        uniqueVisitors?: number;
    }>;
    topPages?: Array<{
        routeKey?: string;
        path?: string;
        views?: number;
        uniqueVisitors?: number;
    }>;
    routeDistribution?: Array<{
        routeKey?: string;
        views?: number;
        uniqueVisitors?: number;
    }>;
    realtime?: {
        onlineUsersNow?: number;
        onlineWindowMinutes?: number;
        trackedVisitors24h?: number;
        lastUpdatedAt?: string | Date;
    };
    monthOverMonthDelta?: {
        currentMonthViews?: number;
        previousMonthViews?: number;
        viewsChangePercent?: number | null;
        currentMonthUniqueVisitors?: number;
        previousMonthUniqueVisitors?: number;
        uniqueVisitorsChangePercent?: number | null;
    };
}

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
    private readonly http = inject(HttpClient);

    getOverview(months = 12, onlineWindowMinutes = 2): Observable<AdminAnalyticsOverview> {
        const params = new HttpParams()
            .set('months', String(months))
            .set('onlineWindowMinutes', String(onlineWindowMinutes));

        return this.http
            .get<ApiResponse<AdminAnalyticsOverviewApiModel>>(API_ENDPOINTS.ADMIN.ANALYTICS_OVERVIEW, { params })
            .pipe(
                map((response) => unwrap(response)),
                map((data) => this.toOverview(data))
            );
    }

    private toOverview(data: AdminAnalyticsOverviewApiModel): AdminAnalyticsOverview {
        const monthlyTraffic: AdminMonthlyTrafficPoint[] = Array.isArray(data.monthlyTraffic)
            ? data.monthlyTraffic.map((item) => ({
                monthKey: item.monthKey?.trim() || '',
                monthLabel: item.monthLabel?.trim() || item.monthKey?.trim() || '',
                views: Number(item.views ?? 0),
                uniqueVisitors: Number(item.uniqueVisitors ?? 0)
            }))
            : [];

        const topPages: AdminTopPageItem[] = Array.isArray(data.topPages)
            ? data.topPages.map((item) => ({
                routeKey: item.routeKey?.trim() || 'OTHER',
                path: item.path?.trim() || '/',
                views: Number(item.views ?? 0),
                uniqueVisitors: Number(item.uniqueVisitors ?? 0)
            }))
            : [];

        const routeDistribution: AdminRouteDistributionItem[] = Array.isArray(data.routeDistribution)
            ? data.routeDistribution.map((item) => ({
                routeKey: item.routeKey?.trim() || 'OTHER',
                views: Number(item.views ?? 0),
                uniqueVisitors: Number(item.uniqueVisitors ?? 0)
            }))
            : [];

        return {
            kpis: {
                pageViews30d: Number(data.kpis?.pageViews30d ?? 0),
                onlineUsersNow: Number(data.kpis?.onlineUsersNow ?? 0),
                totalPosts: Number(data.kpis?.totalPosts ?? 0),
                recruitmentPosts: Number(data.kpis?.recruitmentPosts ?? 0)
            },
            monthlyTraffic,
            topPages,
            routeDistribution,
            realtime: {
                onlineUsersNow: Number(data.realtime?.onlineUsersNow ?? 0),
                onlineWindowMinutes: Number(data.realtime?.onlineWindowMinutes ?? 2),
                trackedVisitors24h: Number(data.realtime?.trackedVisitors24h ?? 0),
                lastUpdatedAt: parseDate(data.realtime?.lastUpdatedAt)
            },
            monthOverMonthDelta: {
                currentMonthViews: Number(data.monthOverMonthDelta?.currentMonthViews ?? 0),
                previousMonthViews: Number(data.monthOverMonthDelta?.previousMonthViews ?? 0),
                viewsChangePercent: data.monthOverMonthDelta?.viewsChangePercent ?? null,
                currentMonthUniqueVisitors: Number(data.monthOverMonthDelta?.currentMonthUniqueVisitors ?? 0),
                previousMonthUniqueVisitors: Number(data.monthOverMonthDelta?.previousMonthUniqueVisitors ?? 0),
                uniqueVisitorsChangePercent: data.monthOverMonthDelta?.uniqueVisitorsChangePercent ?? null
            }
        };
    }
}
