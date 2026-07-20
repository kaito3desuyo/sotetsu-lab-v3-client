import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { timetableEditFormDefaultRouteIds } from './timetable-edit-form-default-route-ids.util';

describe('timetableEditFormDefaultRouteIds', () => {
    const agencies = [
        { agencyId: 'agency-sotetsu', agencyName: '相鉄' },
        { agencyId: 'agency-jre', agencyName: 'JR東日本' },
        { agencyId: 'agency-tokyu', agencyName: '東急' },
    ] as AgencyDetailsDto[];

    const routes = [
        { routeId: 'route-1', agencyId: 'agency-sotetsu' },
        { routeId: 'route-2', agencyId: 'agency-sotetsu' },
        { routeId: 'route-3', agencyId: 'agency-jre' },
        { routeId: 'route-4', agencyId: 'agency-tokyu' },
    ] as RouteDetailsDto[];

    it('自社（相鉄）agencyId に属する路線のみを既定選択にする', () => {
        expect(timetableEditFormDefaultRouteIds(routes, agencies)).toEqual([
            'route-1',
            'route-2',
        ]);
    });

    it('自社路線が1つも解決できない場合は全路線にフォールバックする', () => {
        const otherAgencies = [
            { agencyId: 'agency-jre', agencyName: 'JR東日本' },
        ] as AgencyDetailsDto[];

        expect(
            timetableEditFormDefaultRouteIds(routes, otherAgencies),
        ).toEqual(['route-1', 'route-2', 'route-3', 'route-4']);
    });

    it('agency が未取得（空配列）の場合も全路線にフォールバックする', () => {
        expect(timetableEditFormDefaultRouteIds(routes, [])).toEqual([
            'route-1',
            'route-2',
            'route-3',
            'route-4',
        ]);
    });

    it('routes が空の場合は空配列を返す', () => {
        expect(timetableEditFormDefaultRouteIds([], agencies)).toEqual([]);
    });

    it('agencyId 未設定の路線は自社判定から除外される', () => {
        const routesWithMissingAgency = [
            ...routes,
            { routeId: 'route-5', agencyId: undefined },
        ] as RouteDetailsDto[];

        expect(
            timetableEditFormDefaultRouteIds(routesWithMissingAgency, agencies),
        ).toEqual(['route-1', 'route-2']);
    });
});
