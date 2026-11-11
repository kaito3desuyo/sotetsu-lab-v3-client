import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { selectFormationOnDate } from './select-formation.util';

const formations: FormationDetailsDto[] = [
    {
        formationId: 'old',
        formationNumber: '8713',
        startDate: '1999-09-01',
        endDate: '2026-11-10',
    },
    {
        formationId: 'new',
        formationNumber: '8713',
        startDate: '2026-11-11',
        endDate: null,
    },
    {
        formationId: 'other',
        formationNumber: '8711',
        startDate: '1999-09-01',
        endDate: null,
    },
];

describe('selectFormationOnDate', () => {
    it('その日に有効な行を選ぶ（前の行の最終日）', () => {
        expect(
            selectFormationOnDate(formations, '8713', '2026-11-10')
                ?.formationId,
        ).toBe('old');
    });

    it('その日に有効な行を選ぶ（後の行の初日）', () => {
        expect(
            selectFormationOnDate(formations, '8713', '2026-11-11')
                ?.formationId,
        ).toBe('new');
    });

    it('番号が無ければ null', () => {
        expect(
            selectFormationOnDate(formations, '9999', '2026-11-11'),
        ).toBeNull();
    });
});
