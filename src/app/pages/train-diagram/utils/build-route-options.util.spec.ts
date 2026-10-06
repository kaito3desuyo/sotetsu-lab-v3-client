import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { buildRouteOptions } from './build-route-options.util';

describe('buildRouteOptions', () => {
    it('会社名を group にし、路線名の無いものは空の label にする', () => {
        const agencies = [
            { agencyId: 'a1', agencyName: '相鉄' },
        ] as AgencyDetailsDto[];
        expect(
            buildRouteOptions(
                [
                    { routeId: 'r1', routeName: '本線', agencyId: 'a1' },
                    { routeId: 'r2' },
                ],
                agencies,
            ),
        ).toEqual([
            { value: 'r1', label: '本線', group: '相鉄' },
            { value: 'r2', label: '', group: undefined },
        ]);
    });
});
