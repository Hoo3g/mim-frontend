import { buildLinePoints, maxMetricValue } from './admin-analytics-chart.util';
import { AdminMonthlyTrafficPoint } from '../models/admin-analytics.model';

describe('admin-analytics-chart.util', () => {
    const points: AdminMonthlyTrafficPoint[] = [
        { monthKey: '2026-01', monthLabel: '01/2026', views: 10, uniqueVisitors: 4 },
        { monthKey: '2026-02', monthLabel: '02/2026', views: 30, uniqueVisitors: 15 },
        { monthKey: '2026-03', monthLabel: '03/2026', views: 20, uniqueVisitors: 12 }
    ];

    it('returns at least 1 as max metric value', () => {
        expect(maxMetricValue([])).toBe(1);
        expect(maxMetricValue(points)).toBe(30);
    });

    it('builds stable svg line points string', () => {
        const line = buildLinePoints(points, 'views');
        const coords = line.split(' ');

        expect(coords.length).toBe(3);
        expect(coords[0]).toContain(',');
        expect(coords[1]).toContain(',');
        expect(coords[2]).toContain(',');
    });

    it('returns empty string for empty data', () => {
        expect(buildLinePoints([], 'views')).toBe('');
    });
});
