import { AdminMonthlyTrafficPoint } from '../models/admin-analytics.model';

export type AnalyticsMetric = 'views' | 'uniqueVisitors';

export function maxMetricValue(points: AdminMonthlyTrafficPoint[]): number {
    if (!Array.isArray(points) || points.length === 0) {
        return 1;
    }

    const maxViews = Math.max(...points.map((item) => item.views));
    const maxUniqueVisitors = Math.max(...points.map((item) => item.uniqueVisitors));
    return Math.max(maxViews, maxUniqueVisitors, 1);
}

export function buildLinePoints(
    points: AdminMonthlyTrafficPoint[],
    metric: AnalyticsMetric,
    chart = {
        width: 640,
        height: 220,
        paddingLeft: 20,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 24
    }
): string {
    if (!Array.isArray(points) || points.length === 0) {
        return '';
    }

    const maxValue = maxMetricValue(points);

    return points
        .map((point, index) => {
            const x = chart.paddingLeft
                + (index * (chart.width - chart.paddingLeft - chart.paddingRight)) / Math.max(points.length - 1, 1);
            const rawValue = metric === 'views' ? point.views : point.uniqueVisitors;
            const y = chart.paddingTop
                + (1 - (rawValue / maxValue)) * (chart.height - chart.paddingTop - chart.paddingBottom);
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
}
