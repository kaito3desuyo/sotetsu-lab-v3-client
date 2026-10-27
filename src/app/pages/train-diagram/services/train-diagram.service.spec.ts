import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TRIP_BLOCK_TIMELINE_FIELDS } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { stationToY } from 'src/app/shared/diagram-scale';
import { TrainDiagramStore } from '../stores/train-diagram.store';
import { TrainDiagramService } from './train-diagram.service';

const representativeTrip = {
    tripBlockId: 'b1',
    trips: [
        {
            tripId: 't1',
            tripClass: { tripClassName: '各停' },
            times: [
                {
                    stationId: 's1',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                    departureDays: 0,
                },
                {
                    stationId: 's2',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    arrivalDays: 0,
                },
            ],
        },
    ],
};

describe('Service: TrainDiagram', () => {
    let service: TrainDiagramService;
    let store: InstanceType<typeof TrainDiagramStore>;
    let serviceServiceMock: { findOneWithStations: jest.Mock };
    let tripBlockServiceMock: { findManyByCalendarId: jest.Mock };
    let operationServiceMock: { findManyItineraryLinks: jest.Mock };

    beforeEach(() => {
        serviceServiceMock = {
            findOneWithStations: jest.fn().mockReturnValue(
                of({
                    stations: [
                        { stationId: 's1', stationName: '横浜' },
                        { stationId: 's2', stationName: '星川' },
                    ],
                }),
            ),
        };
        tripBlockServiceMock = {
            findManyByCalendarId: jest
                .fn()
                .mockReturnValue(of({ 0: [representativeTrip], 1: [] })),
        };

        operationServiceMock = {
            findManyItineraryLinks: jest.fn().mockReturnValue(of([])),
        };

        TestBed.configureTestingModule({
            providers: [
                TrainDiagramService,
                { provide: OperationService, useValue: operationServiceMock },
                { provide: ServiceService, useValue: serviceServiceMock },
                {
                    provide: ServiceListState,
                    useValue: { serviceId: signal('service-1') },
                },
                {
                    provide: TripClassService,
                    useValue: { findMany: () => of([]) },
                },
                { provide: TripBlockService, useValue: tripBlockServiceMock },
                {
                    provide: OperationSightingService,
                    useValue: {
                        findOneTimeCrossSectionByOperationNumber: () => of({}),
                    },
                },
            ],
        });

        store = TestBed.inject(TrainDiagramStore);
        service = TestBed.inject(TrainDiagramService);
    });

    it('fetchTripBlocks: calendarId 未設定なら空をセットする', (done) => {
        store.setCalendarId(null);

        service.fetchTripBlocks().subscribe(() => {
            expect(store.tripBlocksByDirection()).toEqual({});
            done();
        });
    });

    it('fetchTripBlocks: 項目を絞って取り、種別の一覧から種別を補ってストアへ設定する', (done) => {
        store.setCalendarId('cal-1');
        store.setTripClasses([
            {
                tripClassId: 'tc-1',
                tripClassName: '快速',
                tripClassColor: '#3f51b5',
            } as any,
        ]);
        tripBlockServiceMock.findManyByCalendarId.mockReturnValueOnce(
            of({
                0: [
                    {
                        tripBlockId: 'b1',
                        trips: [{ tripId: 't1', tripClassId: 'tc-1' }],
                    },
                ],
                1: [],
            }),
        );

        service.fetchTripBlocks().subscribe(() => {
            expect(
                tripBlockServiceMock.findManyByCalendarId,
            ).toHaveBeenCalledWith({
                calendarId: 'cal-1',
                fields: TRIP_BLOCK_TIMELINE_FIELDS,
            });
            expect(
                store.tripBlocksByDirection()[0][0].trips?.[0].tripClass
                    ?.tripClassName,
            ).toBe('快速');
            done();
        });
    });

    it('fetchNetworkStations: serviceId で網羅駅を取得してストアへ設定する', (done) => {
        service.fetchNetworkStations().subscribe(() => {
            expect(serviceServiceMock.findOneWithStations).toHaveBeenCalledWith(
                {
                    serviceId: 'service-1',
                },
            );
            expect(store.networkStations().map((s) => s.stationId)).toEqual([
                's1',
                's2',
            ]);
            done();
        });
    });

    it('fetchNetworkStations 後、駅軸（stationAxis）は取得済み tripBlocks から比例配分で算出される', (done) => {
        store.setTripBlocksByDirection({
            0: [representativeTrip as any],
            1: [],
        });
        // 本来は train-diagram.component.ts が RouteStationListState.routeStations から
        // 別途設定する（選択路線フィルタと buildStationAxis の接続駅複製判定に必要）。
        store.setRouteStations([
            {
                routeId: 'r1',
                routeStationLists: [
                    {
                        routeStationListId: 'r1-s1',
                        routeId: 'r1',
                        stationId: 's1',
                    },
                    {
                        routeStationListId: 'r1-s2',
                        routeId: 'r1',
                        stationId: 's2',
                    },
                ],
            } as any,
        ]);
        store.setSelectedRouteIds(['r1']);

        service.fetchNetworkStations().subscribe(() => {
            const axis = store.stationAxis();
            // 代表各停 1 本の times から駅間 10 分が導出され、駅軸に反映される
            expect(axis && stationToY('s1', axis)).toBe(0);
            expect(axis && stationToY('s2', axis)).toBe(10);
            done();
        });
    });

    it('fetchItineraryLinks: 取れたら failed: false を返し、ストアへ設定する', async () => {
        store.setCalendarId('cal-1');
        const links = [{ operationId: 'op-1' }];
        operationServiceMock.findManyItineraryLinks.mockReturnValueOnce(
            of(links),
        );

        await expect(
            firstValueFrom(service.fetchItineraryLinks()),
        ).resolves.toEqual({ failed: false });
        expect(store.itineraryLinks()).toEqual(links);
    });

    it('fetchItineraryLinks: 取れなくても空として扱い、failed: true を返す', async () => {
        store.setCalendarId('cal-1');
        store.setItineraryLinks([{ operationId: 'old' } as any]);
        operationServiceMock.findManyItineraryLinks.mockReturnValueOnce(
            throwError(() => new Error('offline')),
        );

        await expect(
            firstValueFrom(service.fetchItineraryLinks()),
        ).resolves.toEqual({ failed: true });
        expect(store.itineraryLinks()).toEqual([]);
    });
});
