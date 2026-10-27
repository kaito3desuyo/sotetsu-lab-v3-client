import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ServiceDetailsDto } from '../libs/service/usecase/dtos/service-details.dto';
import { ServiceService } from '../libs/service/usecase/service.service';
import { ServiceListState } from './service-list.state';

const service = (serviceId: string): ServiceDetailsDto =>
    ({ serviceId, serviceName: serviceId }) as ServiceDetailsDto;

describe('ServiceListState', () => {
    let findMany: jest.Mock;
    let store: InstanceType<typeof ServiceListState>;

    beforeEach(() => {
        findMany = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: ServiceService, useValue: { findMany } }],
        });
        store = TestBed.inject(ServiceListState);
    });

    it('取る前の serviceId は undefined', () => {
        expect(store.serviceId()).toBeUndefined();
    });

    it('serviceId は fetch に渡した先頭の ID（ID の順に並べ替えない）', () => {
        findMany.mockReturnValue(of([service('c'), service('a')]));

        store.fetch().subscribe();

        expect(store.serviceId()).toBe('c');
        expect(store.entities().map((s) => s.serviceId)).toEqual(['c', 'a']);
    });
});
