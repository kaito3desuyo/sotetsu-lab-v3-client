import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AgencyService } from '../libs/agency/usecase/agency.service';
import { AgencyDetailsDto } from '../libs/agency/usecase/dtos/agency-details.dto';
import { AgencyListState } from './agency-list.state';

const agency = (agencyId: string): AgencyDetailsDto =>
    ({ agencyId, agencyName: agencyId }) as AgencyDetailsDto;

describe('AgencyListState', () => {
    let findMany: jest.Mock;
    let store: InstanceType<typeof AgencyListState>;

    beforeEach(() => {
        findMany = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: AgencyService, useValue: { findMany } }],
        });
        store = TestBed.inject(AgencyListState);
    });

    it('取る前は空', () => {
        expect(store.agencies()).toEqual([]);
    });

    it('fetch に渡した順のまま返る（ID の順に並べ替えない）', () => {
        findMany.mockReturnValue(of([agency('c'), agency('a'), agency('b')]));

        store.fetch().subscribe();

        expect(store.agencies().map((a) => a.agencyId)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });

    it('取り直すと置き換わる', () => {
        findMany.mockReturnValue(of([agency('a'), agency('b')]));
        store.fetch().subscribe();
        findMany.mockReturnValue(of([agency('z')]));

        store.fetch().subscribe();

        expect(store.agencies().map((a) => a.agencyId)).toEqual(['z']);
    });
});
