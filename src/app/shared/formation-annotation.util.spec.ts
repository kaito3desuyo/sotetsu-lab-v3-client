import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { formatFormationAnnotation } from './formation-annotation.util';

const agencies = [
    { agencyId: 'a-sotetsu', agencyName: '相鉄' },
] as AgencyDetailsDto[];

describe('formatFormationAnnotation', () => {
    it('形式と会社を「・」で連結する', () => {
        expect(
            formatFormationAnnotation(
                { vehicleType: '10000', agencyId: 'a-sotetsu' },
                agencies,
            ),
        ).toBe('10000・相鉄');
    });

    it('会社が解決できなければ形式だけ', () => {
        expect(
            formatFormationAnnotation(
                { vehicleType: '10000', agencyId: 'a-unknown' },
                agencies,
            ),
        ).toBe('10000');
    });

    it('形式が無ければ会社だけ', () => {
        expect(
            formatFormationAnnotation({ agencyId: 'a-sotetsu' }, agencies),
        ).toBe('相鉄');
    });

    it('編成が無ければ空文字', () => {
        expect(formatFormationAnnotation(undefined, agencies)).toBe('');
    });
});
