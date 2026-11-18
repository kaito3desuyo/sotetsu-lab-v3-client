import type { Metric } from 'web-vitals';

/**
 * これを超える LCP は送らない。開いたまま PC がスリープしたり、裏のタブが眠ったりすると、
 * 1 回で何時間にもなり、GA のイベントの値の合計を狂わせる（2026-11-17 に約 12 時間の値が 1 回届いた）
 */
const MAX_LCP_MS = 60_000;

/**
 * web-vitals の値を GA4 のイベントの形に直す。送らない値なら null を返す。
 * value は差分（delta）にして、GA で合計・平均が出せるようにする（web-vitals の README の推奨）
 */
export function toWebVitalsEvent(metric: Metric): {
    name: Metric['name'];
    params: Record<string, string | number>;
} | null {
    if (metric.name === 'LCP' && metric.value > MAX_LCP_MS) {
        return null;
    }

    const params: Record<string, string | number> = {
        value: metric.delta,
        metric_rating: metric.rating,
    };

    // 値は画面を離れるときに遅れて届くことがあるので、測った画面の URL に付ける
    if (metric.navigationURL) {
        params['page_location'] = metric.navigationURL;
    }

    return { name: metric.name, params };
}
