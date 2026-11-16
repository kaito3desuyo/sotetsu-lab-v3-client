import { convertToParamMap, Params } from '@angular/router';
import {
    formatTrainDiagramParams,
    parseTrainDiagramParams,
    TrainDiagramDefaults,
} from './train-diagram-url.util';

const CAL = '11111111-1111-4111-8111-111111111111';
const CAL_TODAY = '99999999-9999-4999-8999-999999999999';
const ROUTE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROUTE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ROUTE_UNKNOWN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** 12:00 の今。defaultStartMinute は 11:30 の位置（04:00 起点で 450 分） */
// 時刻は日本時間で読むので、CI（UTC）でも同じ瞬間になるよう時差を付けて作る
const NOW = new Date('2026-11-16T12:00:00+09:00');
const NOW_START_MINUTE = 450;

function defaults(
    overrides: Partial<TrainDiagramDefaults> = {},
): TrainDiagramDefaults {
    return {
        calendarId: CAL_TODAY,
        routeIds: [ROUTE_A],
        knownRouteIds: new Set([ROUTE_A, ROUTE_B]),
        now: NOW,
        ...overrides,
    };
}

function parse(params: Params, overrides?: Partial<TrainDiagramDefaults>) {
    return parseTrainDiagramParams(
        convertToParamMap(params),
        defaults(overrides),
    );
}

const full: Params = {
    calendar_id: CAL,
    route_ids: ROUTE_A,
    time: '0600',
};

describe('parseTrainDiagramParams', () => {
    describe('そろっている URL', () => {
        it('そのまま読み、書き換えない', () => {
            const { params, needsReplace } = parse({
                ...full,
                route_ids: `${ROUTE_A},${ROUTE_B}`,
                direction: 'up',
            });

            expect(needsReplace).toBe(false);
            expect(params).toMatchObject({
                notFound: false,
                calendarId: CAL,
                routeIds: [ROUTE_A, ROUTE_B],
                direction: 'up',
                startMinute: 120,
                hasMissing: false,
            });
        });

        it.each(['up', 'down', 'both'] as const)(
            'direction=%s を通す',
            (direction) => {
                expect(parse({ ...full, direction }).params.direction).toBe(
                    direction,
                );
            },
        );

        it('direction が無ければ both（書き換えない）', () => {
            const { params, needsReplace } = parse(full);

            expect(params.direction).toBe('both');
            expect(needsReplace).toBe(false);
        });

        it('空の direction は無いものとして both（不正にしない）', () => {
            const { params, needsReplace } = parse({ ...full, direction: '' });

            expect(params.notFound).toBe(false);
            expect(params.direction).toBe('both');
            expect(needsReplace).toBe(false);
        });
    });

    describe('無い値を補う（replaceUrl の対象）', () => {
        it('何も無ければ、今日のダイヤ・既定の路線・今の時刻で補う', () => {
            const { params, needsReplace } = parse({});

            expect(needsReplace).toBe(true);
            expect(params).toMatchObject({
                notFound: false,
                calendarId: CAL_TODAY,
                routeIds: [ROUTE_A],
                direction: 'both',
                startMinute: NOW_START_MINUTE,
                hasMissing: true,
            });
        });

        it('calendar_id だけ無ければ今日のダイヤで補い、ほかの値は保つ', () => {
            const { params, needsReplace } = parse({
                route_ids: ROUTE_B,
                time: '0600',
            });

            expect(needsReplace).toBe(true);
            expect(params.calendarId).toBe(CAL_TODAY);
            expect(params.routeIds).toEqual([ROUTE_B]);
            expect(params.startMinute).toBe(120);
        });

        it('route_ids だけ無ければ既定の路線で補う', () => {
            const { params, needsReplace } = parse(
                { calendar_id: CAL, time: '0600' },
                { routeIds: [ROUTE_A, ROUTE_B] },
            );

            expect(needsReplace).toBe(true);
            expect(params.routeIds).toEqual([ROUTE_A, ROUTE_B]);
        });

        it('time だけ無ければ今の時刻で補う', () => {
            const { params, needsReplace } = parse({
                calendar_id: CAL,
                route_ids: ROUTE_A,
            });

            expect(needsReplace).toBe(true);
            expect(params.startMinute).toBe(NOW_START_MINUTE);
        });

        it.each(['calendar_id', 'route_ids', 'time'])(
            '空の %s は無いものとして補う',
            (key) => {
                const { params, needsReplace } = parse({ ...full, [key]: '' });

                expect(params.notFound).toBe(false);
                expect(needsReplace).toBe(true);
            },
        );

        it('補う先のダイヤが決まらない（今日のダイヤ無し）ときは書き換えない', () => {
            const { params, needsReplace } = parse({}, { calendarId: null });

            expect(params.calendarId).toBeNull();
            expect(params.hasMissing).toBe(true);
            expect(needsReplace).toBe(false);
        });

        it('補う路線が無い（既定の路線が空）ときは書き換えない', () => {
            const { params, needsReplace } = parse(
                { calendar_id: CAL, time: '0600' },
                { routeIds: [] },
            );

            expect(params.routeIds).toEqual([]);
            expect(params.hasMissing).toBe(true);
            expect(needsReplace).toBe(false);
        });
    });

    describe('古い window=', () => {
        it('time に置き換える対象にし、window の時刻を左端にする', () => {
            const { params, needsReplace } = parse({
                calendar_id: CAL,
                route_ids: ROUTE_A,
                window: '0600-0800',
            });

            expect(needsReplace).toBe(true);
            expect(params.hasMissing).toBe(true);
            expect(params.startMinute).toBe(120);
        });

        it('time と window が両方あれば time を使う', () => {
            const { params, needsReplace } = parse({
                ...full,
                time: '0800',
                window: '0600-0800',
            });

            expect(params.startMinute).toBe(240);
            expect(needsReplace).toBe(true);
        });

        it('window を書き戻す形に載せず、direction など他の値は落とさない', () => {
            const { params } = parse({
                calendar_id: CAL,
                route_ids: ROUTE_A,
                direction: 'down',
                window: '0600-0800',
            });

            const url = formatTrainDiagramParams(params);

            expect(url).toEqual({
                calendar_id: CAL,
                route_ids: ROUTE_A,
                direction: 'down',
                time: '0600',
            });
            expect('window' in url).toBe(false);
        });
    });

    describe('不正な値（見つからない表示にして書き換えない）', () => {
        it.each([
            ['calendar_id が UUID でない', { calendar_id: 'undefined' }],
            ['route_ids に UUID でない要素', { route_ids: `${ROUTE_A},abc` }],
            ['route_ids に空の要素', { route_ids: `${ROUTE_A},` }],
            ['direction が不正', { direction: 'left' }],
            ['time が不正（形）', { time: 'abc' }],
            ['time が不正（分が 60 以上）', { time: '0660' }],
            ['time が範囲外', { time: '0300' }],
            ['window が不正', { window: 'abc' }],
        ] as const)('%s', (_name, override) => {
            const { params, needsReplace } = parse({ ...full, ...override });

            expect(params.notFound).toBe(true);
            expect(needsReplace).toBe(false);
        });

        it('不正な値は、無い値があっても補わず見つからない表示にする', () => {
            const { params, needsReplace } = parse({ direction: 'left' });

            expect(params.notFound).toBe(true);
            expect(needsReplace).toBe(false);
        });
    });

    describe('路線の一覧にある路線か', () => {
        it('一覧に無い route_id は見つからない表示にする', () => {
            const { params, needsReplace } = parse({
                ...full,
                route_ids: `${ROUTE_A},${ROUTE_UNKNOWN}`,
            });

            expect(params.notFound).toBe(true);
            expect(needsReplace).toBe(false);
        });

        it('一覧がまだ空なら、存在は調べない', () => {
            const { params } = parse(
                { ...full, route_ids: ROUTE_UNKNOWN },
                { knownRouteIds: new Set() },
            );

            expect(params.notFound).toBe(false);
            expect(params.routeIds).toEqual([ROUTE_UNKNOWN]);
        });

        it('既定の路線は一覧に無くても見つからない扱いにしない', () => {
            const { params } = parse(
                {},
                {
                    routeIds: [ROUTE_UNKNOWN],
                    knownRouteIds: new Set([ROUTE_A]),
                },
            );

            expect(params.notFound).toBe(false);
        });
    });
});

describe('formatTrainDiagramParams', () => {
    it('補った値を matrix params にし、元の並びを保つ', () => {
        const { params } = parse({ direction: 'up', foo: 'bar' });

        expect(Object.keys(formatTrainDiagramParams(params))).toEqual([
            'direction',
            'foo',
            'calendar_id',
            'route_ids',
            'time',
        ]);
        expect(formatTrainDiagramParams(params)).toEqual({
            direction: 'up',
            foo: 'bar',
            calendar_id: CAL_TODAY,
            route_ids: ROUTE_A,
            time: '1130',
        });
    });

    it('route_ids はカンマ区切りにする', () => {
        const { params } = parse({}, { routeIds: [ROUTE_A, ROUTE_B] });

        expect(formatTrainDiagramParams(params)['route_ids']).toBe(
            `${ROUTE_A},${ROUTE_B}`,
        );
    });
});
