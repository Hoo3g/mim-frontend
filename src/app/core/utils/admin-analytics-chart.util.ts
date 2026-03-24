import { AdminMonthlyTrafficPoint } from '../models/admin-analytics.model';

export type AnalyticsMetric = 'views' | 'uniqueVisitors';
export interface AnalyticsChartCoordinate {
    x: number;
    y: number;
}

export interface AnalyticsChartBounds {
    width: number;
    height: number;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
}

const DEFAULT_CHART_BOUNDS: AnalyticsChartBounds = {
    width: 640,
    height: 220,
    paddingLeft: 20,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 24
};

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
    chart: AnalyticsChartBounds = DEFAULT_CHART_BOUNDS
): string {
    return buildMetricCoordinates(points, metric, chart)
        .map((item) => `${item.x.toFixed(2)},${item.y.toFixed(2)}`)
        .join(' ');
}

export function buildMetricCoordinates(
    points: AdminMonthlyTrafficPoint[],
    metric: AnalyticsMetric,
    chart: AnalyticsChartBounds = DEFAULT_CHART_BOUNDS
): AnalyticsChartCoordinate[] {
    if (!Array.isArray(points) || points.length === 0) {
        return [];
    }

    const maxValue = maxMetricValue(points);
    const chartWidth = Math.max(chart.width - chart.paddingLeft - chart.paddingRight, 1);
    const chartHeight = Math.max(chart.height - chart.paddingTop - chart.paddingBottom, 1);

    return points
        .map((point, index) => {
            const progress = points.length === 1 ? 0.5 : index / Math.max(points.length - 1, 1);
            const x = chart.paddingLeft
                + progress * chartWidth;
            const rawValue = metric === 'views' ? point.views : point.uniqueVisitors;
            const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
            const y = chart.paddingTop
                + (1 - (safeValue / maxValue)) * chartHeight;
            return {
                x: Number(x.toFixed(2)),
                y: Number(y.toFixed(2))
            };
        })
        .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
}
