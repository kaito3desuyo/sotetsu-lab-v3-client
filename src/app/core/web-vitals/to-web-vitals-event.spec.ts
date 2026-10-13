import type { Metric } from 'web-vitals';
import { toWebVitalsEvent } from './to-web-vitals-event';

const metric = (overrides: Partial<Metric> = {}): Metric =>
    ({
        name: 'LCP',
        value: 2400,
        delta: 2400,
        rating: 'good',
        id: 'v5-1',
        entries: [],
        navigationType: 'navigate',
        navigationId: 1,
        ...overrides,
    }) as Metric;

describe('toWebVitalsEvent', () => {
    it('名前をイベント名にし、差分を value・評価を metric_rating に載せる', () => {
        expect(
            toWebVitalsEvent(
                metric({
                    name: 'INP',
                    delta: 120,
                    rating: 'needs-improvement',
                }),
            ),
        ).toEqual({
            name: 'INP',
            params: { value: 120, metric_rating: 'needs-improvement' },
        });
    });

    it('測った画面の URL があれば page_location に載せる', () => {
        expect(
            toWebVitalsEvent(
                metric({
                    navigationURL: 'https://v3.sotetsu-lab.com/train-location',
                }),
            ).params,
        ).toEqual({
            value: 2400,
            metric_rating: 'good',
            page_location: 'https://v3.sotetsu-lab.com/train-location',
        });
    });
});
