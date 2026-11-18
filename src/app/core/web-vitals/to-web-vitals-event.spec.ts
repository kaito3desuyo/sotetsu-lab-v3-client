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
            )?.params,
        ).toEqual({
            value: 2400,
            metric_rating: 'good',
            page_location: 'https://v3.sotetsu-lab.com/train-location',
        });
    });

    it('LCP が 60 秒を超えたら送らない（スリープや裏のタブで何時間にもなった値）', () => {
        expect(
            toWebVitalsEvent(metric({ value: 43_879_148, delta: 43_879_148 })),
        ).toBeNull();
    });

    it('LCP がちょうど 60 秒なら送る', () => {
        expect(
            toWebVitalsEvent(metric({ value: 60_000, delta: 60_000 }))?.params[
                'value'
            ],
        ).toBe(60_000);
    });

    it('INP は 60 秒を超えても送る', () => {
        expect(
            toWebVitalsEvent(
                metric({ name: 'INP', value: 70_000, delta: 70_000 }),
            )?.name,
        ).toBe('INP');
    });
});
