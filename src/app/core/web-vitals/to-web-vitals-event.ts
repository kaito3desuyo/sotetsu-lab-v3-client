import type { Metric } from 'web-vitals';

/**
 * web-vitals の値を GA4 のイベントの形に直す。
 * value は差分（delta）にして、GA で合計・平均が出せるようにする（web-vitals の README の推奨）
 */
export function toWebVitalsEvent(metric: Metric): {
    name: Metric['name'];
    params: Record<string, string | number>;
} {
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
