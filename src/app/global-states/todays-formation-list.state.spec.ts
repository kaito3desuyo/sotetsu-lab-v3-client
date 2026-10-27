import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { of } from 'rxjs';
import { AgencyDetailsDto } from '../libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from '../libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from '../libs/formation/usecase/formation.service';
import { AgencyListState } from './agency-list.state';
import { TodaysFormationListState } from './todays-formation-list.state';

const formation = (
    formationId: string,
    agencyId: string,
    formationNumber: string,
): FormationDetailsDto =>
    ({ formationId, agencyId, formationNumber }) as FormationDetailsDto;

describe('TodaysFormationListState', () => {
    let findManyBySpecificDate: jest.Mock;
    let store: InstanceType<typeof TodaysFormationListState>;

    beforeEach(() => {
        findManyBySpecificDate = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: FormationService,
                    useValue: { findManyBySpecificDate },
                },
            ],
        });
        store = TestBed.inject(TodaysFormationListState);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    /** 会社の一覧を、渡した順のまま入れる */
    function setAgencies(agencyNames: string[]): void {
        patchState(
            unprotected(TestBed.inject(AgencyListState)),
            setAllEntities(
                agencyNames.map(
                    (agencyName) =>
                        ({
                            agencyId: agencyName,
                            agencyName,
                        }) as AgencyDetailsDto,
                ),
                { selectId: (agency: AgencyDetailsDto) => agency.agencyId },
            ),
        );
    }

    it('取る前は空', () => {
        expect(store.todaysFormations()).toEqual([]);
        expect(store.todaysFormationsSorted()).toEqual([]);
    });

    it('fetch に渡した順のまま返る（ID の順に並べ替えない）', () => {
        findManyBySpecificDate.mockReturnValue(
            of([
                formation('c', 'x', '3'),
                formation('a', 'x', '1'),
                formation('b', 'x', '2'),
            ]),
        );

        store.fetch().subscribe();

        expect(store.todaysFormations().map((f) => f.formationId)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });

    it('取り直すと置き換わる', () => {
        findManyBySpecificDate.mockReturnValue(of([formation('a', 'x', '1')]));
        store.fetch().subscribe();
        findManyBySpecificDate.mockReturnValue(of([formation('z', 'x', '9')]));

        store.fetch().subscribe();

        expect(store.todaysFormations().map((f) => f.formationId)).toEqual([
            'z',
        ]);
    });

    it('鉄道日で今日の日付を渡す（4 時前は前日）。取るたびに今の時刻で決める', () => {
        findManyBySpecificDate.mockReturnValue(of([]));
        jest.useFakeTimers({ now: new Date(2026, 9, 27, 2, 0) });

        store.fetch().subscribe();
        jest.setSystemTime(new Date(2026, 9, 27, 5, 0));
        store.fetch().subscribe();

        expect(findManyBySpecificDate.mock.calls).toEqual([
            [{ date: '2026-10-26' }],
            [{ date: '2026-10-27' }],
        ]);
    });

    describe('todaysFormationsSorted', () => {
        beforeEach(() => {
            setAgencies(['東急', 'JR東日本', '相鉄']);
            findManyBySpecificDate.mockReturnValue(
                of([
                    formation('t1', '東急', '5010'),
                    formation('j10', 'JR東日本', 'E10'),
                    formation('s2', '相鉄', '12000-2'),
                    formation('j2', 'JR東日本', 'E2'),
                    formation('s1', '相鉄', '12000-1'),
                ]),
            );
            store.fetch().subscribe();
        });

        it('会社は相鉄と直通を始めた順、会社の中は編成番号の数値順', () => {
            expect(
                store.todaysFormationsSorted().map((f) => f.formationId),
            ).toEqual(['s1', 's2', 'j2', 'j10', 't1']);
        });

        it('元の並びは変えない', () => {
            expect(store.todaysFormations().map((f) => f.formationId)).toEqual([
                't1',
                'j10',
                's2',
                'j2',
                's1',
            ]);
        });

        it('会社の一覧が替わると並びも替わる', () => {
            setAgencies([]);
            // 会社の順が決まらない間は、編成番号の数値順だけ
            expect(
                store.todaysFormationsSorted().map((f) => f.formationId),
            ).toEqual(['t1', 's1', 's2', 'j2', 'j10']);

            setAgencies(['東急', 'JR東日本', '相鉄']);

            expect(
                store.todaysFormationsSorted().map((f) => f.formationId),
            ).toEqual(['s1', 's2', 'j2', 'j10', 't1']);
        });
    });
});
