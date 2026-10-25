import { toFieldsParams } from './to-fields-params';

describe('toFieldsParams', () => {
    it('資源ごとに fields[資源] をキーに、項目をカンマでつないだ値にする', () => {
        expect(
            toFieldsParams({
                route: ['routeName', 'routeColor'],
                station: ['stationName'],
            }),
        ).toEqual({
            'fields[route]': 'routeName,routeColor',
            'fields[station]': 'stationName',
        });
    });

    it('空の組は空のオブジェクトにする', () => {
        expect(toFieldsParams({})).toEqual({});
    });
});
