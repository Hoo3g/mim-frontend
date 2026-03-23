export interface AdminAnalyticsKpis {
    pageViews30d: number;
    onlineUsersNow: number;
    totalPosts: number;
    recruitmentPosts: number;
}

export interface AdminMonthlyTrafficPoint {
    monthKey: string;
    monthLabel: string;
    views: number;
    uniqueVisitors: number;
}

export interface AdminTopPageItem {
    routeKey: string;
    path: string;
    views: number;
    uniqueVisitors: number;
}

export interface AdminRouteDistributionItem {
    routeKey: string;
    views: number;
    uniqueVisitors: number;
}

export interface AdminAnalyticsRealtime {
    onlineUsersNow: number;
    onlineWindowMinutes: number;
    trackedVisitors24h: number;
    lastUpdatedAt: Date;
}

export interface AdminMonthOverMonthDelta {
    currentMonthViews: number;
    previousMonthViews: number;
    viewsChangePercent: number | null;
    currentMonthUniqueVisitors: number;
    previousMonthUniqueVisitors: number;
    uniqueVisitorsChangePercent: number | null;
}

export interface AdminAnalyticsOverview {
    kpis: AdminAnalyticsKpis;
    monthlyTraffic: AdminMonthlyTrafficPoint[];
    topPages: AdminTopPageItem[];
    routeDistribution: AdminRouteDistributionItem[];
    realtime: AdminAnalyticsRealtime;
    monthOverMonthDelta: AdminMonthOverMonthDelta;
}
