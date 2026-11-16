import { canonicalPath } from './canonical-url';

describe('canonicalPath', () => {
    it('条件の無い URL はそのまま', () => {
        expect(canonicalPath('/timetable/station')).toBe('/timetable/station');
        expect(canonicalPath('/')).toBe('/');
    });

    it('条件（行列の引数）は残し、鍵の順に並べる', () => {
        expect(
            canonicalPath('/timetable/station;trip_direction=1;station_id=s1'),
        ).toBe('/timetable/station;station_id=s1;trip_direction=1');
    });

    it('行列の引数が重なれば、ページが読む後の値だけを残す', () => {
        expect(
            canonicalPath('/operation/table;calendar_id=a;calendar_id=b'),
        ).toBe('/operation/table;calendar_id=b');
    });

    it('query は鍵の順に並べ、重なれば最初の値だけを残す', () => {
        expect(canonicalPath('/train-location?b=2&a=1&a=3')).toBe(
            '/train-location?a=1&b=2',
        );
    });

    it('計測の引数と # を落とす', () => {
        expect(
            canonicalPath(
                '/train-location;route_id=r1?utm_source=x&utm_medium=y&gclid=z&fbclid=w#top',
            ),
        ).toBe('/train-location;route_id=r1');
    });
});
