import { DefaultUrlSerializer, Params, UrlSegmentGroup } from '@angular/router';

/** 広告と SNS の計測が足す引数。中身は変わらないので canonical から落とす */
const TRACKING_PARAM = /^(utm_.+|gclid|fbclid|msclkid|yclid)$/;

const serializer = new DefaultUrlSerializer();

/**
 * canonical に入れる、そのページの URL のパス（14 SEO）。
 * 条件付きの URL（駅・路線・ダイヤの指定）も検索から入ってくるので、条件は残す。
 * 同じ中身で URL だけが違う形（引数の並び・同じ鍵の重なり・計測の引数・#）だけをそろえる。
 */
export function canonicalPath(url: string): string {
    const tree = serializer.parse(url);
    normalizeGroup(tree.root);
    tree.queryParams = sortParams(tree.queryParams, true);
    tree.fragment = null;
    return serializer.serialize(tree);
}

function normalizeGroup(group: UrlSegmentGroup): void {
    for (const segment of group.segments) {
        segment.parameters = sortParams(segment.parameters, false);
    }
    for (const child of Object.values(group.children)) {
        normalizeGroup(child);
    }
}

/**
 * 鍵の順に並べ、同じ鍵が重なっていれば 1 つにする。ページが読む値に合わせる:
 * 行列の引数は parse の時点で後の値が残り、query は配列になるが ParamMap.get が最初の値を返す。
 */
function sortParams(params: Params, dropTracking: boolean): Params {
    const sorted: Params = {};
    for (const key of Object.keys(params).sort()) {
        if (dropTracking && TRACKING_PARAM.test(key)) continue;
        const value = params[key];
        sorted[key] = Array.isArray(value) ? value[0] : value;
    }
    return sorted;
}
