import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { OperationRealTimeStore } from '../stores/operation-real-time.store';
import { OperationRealTimeService } from './operation-real-time.service';

describe('OperationRealTimeService（まとめて取る口）', () => {
    let service: OperationRealTimeService;
    const operationService = { findManyWithCurrentPosition: jest.fn() };
    const serviceService = { findOneWithStations: jest.fn() };
    const operationSightingService = {
        findManyTimeCrossSectionsByOperationNumbers: jest.fn(),
        findManyTimeCrossSectionsByFormationNumbers: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                OperationRealTimeService,
                { provide: OperationService, useValue: operationService },
                {
                    provide: OperationSightingService,
                    useValue: operationSightingService,
                },
                { provide: ServiceService, useValue: serviceService },
                { provide: TripClassService, useValue: {} },
                { provide: CalendarService, useValue: {} },
                { provide: FormationService, useValue: {} },
                { provide: AgencyListStateQuery, useValue: {} },
                { provide: RouteStationListStateQuery, useValue: {} },
            ],
        });
        service = TestBed.inject(OperationRealTimeService);
        OperationRealTimeStore.setOperations([
            { operationId: 'op-11', operationNumber: '11' },
            { operationId: 'op-100', operationNumber: '100' },
            { operationId: 'op-12', operationNumber: '12' },
        ] as OperationDetailsDto[]);
        OperationRealTimeStore.setFormations([
            { formationNumber: '10701' },
        ] as FormationDetailsDto[]);
    });

    it('現在位置は 1 回で全運用を取り、運用 id から運用番号に振り分ける', async () => {
        const position11 = {
            operation: { operationId: 'op-11' },
        } as OperationCurrentPositionDto;
        operationService.findManyWithCurrentPosition.mockReturnValue(
            of([position11]),
        );

        await firstValueFrom(
            service.fetchCurrentPositions({ forceReload: true }),
        );

        expect(
            operationService.findManyWithCurrentPosition,
        ).toHaveBeenCalledTimes(1);
        expect(
            operationService.findManyWithCurrentPosition,
        ).toHaveBeenCalledWith({
            // ストアの operations は休車の 100 を含まない
            operationIds: ['op-11', 'op-12'],
            forceReload: true,
        });
        const positions = await firstValueFrom(
            OperationRealTimeStore.currentPositions$,
        );
        expect(positions['11']).toBe(position11);
    });

    it('運用番号の時刻断面は 100 を除いて 1 回で取り、番号ごとにストアへ入れる', async () => {
        const crossSection = { latestSighting: null, expectedSighting: null };
        operationSightingService.findManyTimeCrossSectionsByOperationNumbers.mockReturnValue(
            of({ '11': crossSection }),
        );

        await firstValueFrom(service.fetchOperationSightingTimeCrossSections());

        expect(
            operationSightingService.findManyTimeCrossSectionsByOperationNumbers,
        ).toHaveBeenCalledWith({
            operationNumbers: ['11', '12'],
            forceReload: undefined,
        });
        const stored = await firstValueFrom(
            OperationRealTimeStore.operationSightingTimeCrossSections$,
        );
        expect(stored['11']).toBe(crossSection);
    });

    it('編成番号の時刻断面は 1 回で取り、番号ごとにストアへ入れる', async () => {
        const crossSection = { latestSighting: null, expectedSighting: null };
        operationSightingService.findManyTimeCrossSectionsByFormationNumbers.mockReturnValue(
            of({ '10701': crossSection }),
        );

        await firstValueFrom(service.fetchFormationSightingTimeCrossSections());

        const stored = await firstValueFrom(
            OperationRealTimeStore.formationSightingTimeCrossSections$,
        );
        expect(stored['10701']).toBe(crossSection);
    });

    it('駅は運行系統の駅一覧 1 回で取ってストアへ入れる', async () => {
        const stations = [{ stationId: 'st-1', stationName: '二俣川' }];
        serviceService.findOneWithStations.mockReturnValue(of({ stations }));

        await firstValueFrom(service.fetchStations());

        expect(serviceService.findOneWithStations).toHaveBeenCalledTimes(1);
        expect(await firstValueFrom(OperationRealTimeStore.stations$)).toBe(
            stations,
        );
    });
});
