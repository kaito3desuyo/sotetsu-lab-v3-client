import { parseRoutePreloadTable, routePreloadFor } from './route-preloads';

const table = {
    '/': 'chunk-root.js',
    '/timetable/station': 'chunk-station.js',
    '/timetable/all-line': 'chunk-all.js',
    '/moderation': 'chunk-recent.js',
    '/moderation/users/:userId': 'chunk-user.js',
};

describe('routePreloadFor', () => {
    it('matrix params の付いた URL でもページの chunk を返す', () => {
        expect(routePreloadFor('/timetable/station;station_id=x', table)).toBe(
            'chunk-station.js',
        );
        expect(
            routePreloadFor('/timetable;a=b/station;station_id=x;c=d', table),
        ).toBe('chunk-station.js');
    });

    it('クエリ・ハッシュ・末尾の / を無視する', () => {
        expect(routePreloadFor('/timetable/station/?a=1#top', table)).toBe(
            'chunk-station.js',
        );
        expect(routePreloadFor('/timetable/station;x=1?y=2', table)).toBe(
            'chunk-station.js',
        );
    });

    it('ルートは / そのものにだけ当たる', () => {
        expect(routePreloadFor('/', table)).toBe('chunk-root.js');
        expect(routePreloadFor('', table)).toBe('chunk-root.js');
        expect(routePreloadFor('/?a=1', table)).toBe('chunk-root.js');
        expect(routePreloadFor('/no-such-page', table)).toBeNull();
    });

    it('表に無い path は null', () => {
        expect(routePreloadFor('/timetable', table)).toBeNull();
        expect(routePreloadFor('/timetable/stationary', table)).toBeNull();
    });

    it('一番長く一致する鍵を使い、:param は何にでも当たる', () => {
        expect(routePreloadFor('/moderation', table)).toBe('chunk-recent.js');
        expect(routePreloadFor('/moderation/users/abc', table)).toBe(
            'chunk-user.js',
        );
        expect(routePreloadFor('/moderation/other', table)).toBe(
            'chunk-recent.js',
        );
    });
});

describe('parseRoutePreloadTable', () => {
    it('文字列の値だけを表にする', () => {
        expect(parseRoutePreloadTable({ '/a': 'x.js', '/b': 1 })).toEqual({
            '/a': 'x.js',
        });
    });

    it('表にならないものは null', () => {
        expect(parseRoutePreloadTable(null)).toBeNull();
        expect(parseRoutePreloadTable([])).toBeNull();
        expect(parseRoutePreloadTable({})).toBeNull();
        expect(parseRoutePreloadTable('x')).toBeNull();
    });
});
