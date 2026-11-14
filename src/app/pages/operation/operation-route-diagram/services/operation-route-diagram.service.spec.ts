import { TestBed, inject } from '@angular/core/testing';
import { lastValueFrom, of, throwError } from 'rxjs';

import { ServiceListState } from 'src/app/global-states/service-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { OperationRouteDiagramStore } from '../stores/operation-route-diagram.store';
import { OperationRouteDiagramService } from './operation-route-diagram.service';

describe('Service: OperationRouteDiagram', () => {
    const operationService = { findOneWithTrips: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                OperationRouteDiagramService,
                { provide: ServiceService, useValue: {} },
                { provide: OperationService, useValue: operationService },
                { provide: ServiceListState, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [OperationRouteDiagramService],
        (service: OperationRouteDiagramService) => {
            expect(service).toBeTruthy();
        },
    ));

    // api は無い ID に 404 でなく 200 と空の本文（null）を返す
    it('運用の行路: 取れたら true、api が null を返したら false（ストアは null にする）', inject(
        [OperationRouteDiagramService],
        async (service: OperationRouteDiagramService) => {
            const store = TestBed.inject(OperationRouteDiagramStore);
            store.setOperationId('op-1');

            const found = {
                operation: { operationId: 'op-1' },
                trips: [],
            };
            operationService.findOneWithTrips.mockReturnValue(of(found));
            expect(await lastValueFrom(service.fetchOperationTrips())).toBe(
                true,
            );
            expect(store.operation()).toEqual(found.operation);

            operationService.findOneWithTrips.mockReturnValue(of(null));
            expect(await lastValueFrom(service.fetchOperationTrips())).toBe(
                false,
            );
            expect(store.operation()).toBeUndefined();
        },
    ));

    it('運用の行路: 失敗（5xx・通信の失敗）はエラーのまま流す', inject(
        [OperationRouteDiagramService],
        async (service: OperationRouteDiagramService) => {
            TestBed.inject(OperationRouteDiagramStore).setOperationId('op-1');
            operationService.findOneWithTrips.mockReturnValue(
                throwError(() => new Error('500')),
            );

            await expect(
                lastValueFrom(service.fetchOperationTrips()),
            ).rejects.toThrow('500');
        },
    ));
});
