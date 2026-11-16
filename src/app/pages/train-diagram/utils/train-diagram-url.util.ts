import { ParamMap, Params } from '@angular/router';
import { parseUuid, readUrlParam } from 'src/app/shared/url-params/url-param';
import type { DiagramDirectionFilter } from '../stores/train-diagram.store';
import {
    defaultStartMinute,
    formatTimeParam,
    parseLegacyWindowParam,
    parseTimeParam,
} from './diagram-timeline.util';

/** URL が無いとき・空のときに補う値。呼び出し側（component）が、そのときの状態から渡す。 */
export interface TrainDiagramDefaults {
    /** 今日のダイヤ。無ければ null */
    calendarId: string | null;
    /** route_ids 未指定のときの既定の路線 */
    routeIds: string[];
    /** 路線の一覧にある routeId。空のときは、一覧がまだ無いとみて存在の検査をしない */
    knownRouteIds: ReadonlySet<string>;
    /** time も window も無いときの左端（defaultStartMinute に渡す今の時刻） */
    now: Date;
}

export interface TrainDiagramParams {
    /** 値があるのに不正、または路線の一覧に無い路線。true のとき、ほかの値は既定のまま使わない */
    notFound: boolean;
    calendarId: string | null;
    routeIds: string[];
    direction: DiagramDirectionFilter;
    /** time → 古い window → 今の時刻 の順で決めた左端の分 */
    startMinute: number;
    /** calendar_id・route_ids・time が無い、または古い window がある（URL に補って書き換える対象） */
    hasMissing: boolean;
    /** matrix param のうち window 以外（書き換えるときに落とさない。順も保つ） */
    rest: Record<string, string>;
}

/** route_ids: カンマ区切りで、どの要素も UUID（空の要素は不正） */
function parseRouteIds(raw: string): string[] | null {
    const ids = raw.split(',');
    return ids.every((id) => parseUuid(id) !== null) ? ids : null;
}

function parseDirectionParam(raw: string): DiagramDirectionFilter | null {
    return raw === 'up' || raw === 'down' || raw === 'both' ? raw : null;
}

function parseTimeMinute(raw: string): number | null {
    return parseTimeParam(raw) ?? null;
}

function parseWindowMinute(raw: string): number | null {
    return parseLegacyWindowParam(raw) ?? null;
}

/**
 * matrix params を読んで、表示に使う値にそろえる。
 * needsReplace は、補った値を URL に書き戻す（replaceUrl で遷移し直す）べきとき true。
 * 補う先（ダイヤ・路線）が決まらないときは false（URL は書き換えず、骨組みのまま進む）。
 */
export function parseTrainDiagramParams(
    paramMap: ParamMap,
    defaults: TrainDiagramDefaults,
): { params: TrainDiagramParams; needsReplace: boolean } {
    const opts = { emptyAsMissing: true };
    const calendarIdParam = readUrlParam(
        paramMap.get('calendar_id'),
        parseUuid,
        opts,
    );
    const routeIdsParam = readUrlParam(
        paramMap.get('route_ids'),
        parseRouteIds,
        opts,
    );
    const directionParam = readUrlParam(
        paramMap.get('direction'),
        parseDirectionParam,
        opts,
    );
    const timeParam = readUrlParam(paramMap.get('time'), parseTimeMinute, opts);
    const windowParam = readUrlParam(
        paramMap.get('window'),
        parseWindowMinute,
        opts,
    );

    const rest: Record<string, string> = {};
    for (const key of paramMap.keys) {
        if (key === 'window') {
            continue;
        }
        rest[key] = paramMap.get(key) ?? '';
    }

    const notFound =
        [
            calendarIdParam,
            routeIdsParam,
            directionParam,
            timeParam,
            windowParam,
        ].some((param) => param.kind === 'invalid') ||
        (routeIdsParam.kind === 'ok' &&
            defaults.knownRouteIds.size > 0 &&
            routeIdsParam.value.some((id) => !defaults.knownRouteIds.has(id)));

    const calendarId =
        calendarIdParam.kind === 'ok'
            ? calendarIdParam.value
            : defaults.calendarId;
    const routeIds =
        routeIdsParam.kind === 'ok' ? routeIdsParam.value : defaults.routeIds;
    const direction =
        directionParam.kind === 'ok' ? directionParam.value : 'both';
    const startMinute =
        timeParam.kind === 'ok'
            ? timeParam.value
            : windowParam.kind === 'ok'
              ? windowParam.value
              : defaultStartMinute(defaults.now);
    const hasMissing =
        calendarIdParam.kind === 'missing' ||
        routeIdsParam.kind === 'missing' ||
        timeParam.kind === 'missing' ||
        windowParam.kind === 'ok';

    return {
        params: {
            notFound,
            calendarId,
            routeIds,
            direction,
            startMinute,
            hasMissing,
            rest,
        },
        needsReplace:
            !notFound && hasMissing && !!calendarId && routeIds.length > 0,
    };
}

/** 補った値を URL の matrix params に書き戻す形にする（window は time に置き換わる）。 */
export function formatTrainDiagramParams(params: TrainDiagramParams): Params {
    return {
        ...params.rest,
        calendar_id: params.calendarId,
        route_ids: params.routeIds.join(','),
        time: formatTimeParam(params.startMinute),
    };
}
