import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
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
    let serviceServiceMock: { findOneWithStations: jest.Mock };
    let tripBlockServiceMock: { findManyByCalendarId: jest.Mock };

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

        TestBed.configureTestingModule({
            providers: [
                TrainDiagramService,
                { provide: ServiceService, useValue: serviceServiceMock },
                {
                    provide: ServiceListStateQuery,
                    useValue: { serviceId: 'service-1' },
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

        service = TestBed.inject(TrainDiagramService);
    });

    afterEach(() => {
        TrainDiagramStore.setCalendarId(null);
        TrainDiagramStore.setSelectedRouteIds([]);
        TrainDiagramStore.setTripBlocksByDirection({});
        TrainDiagramStore.setNetworkStations([]);
        TrainDiagramStore.setRouteStations([]);
        TrainDiagramStore.setTripClasses([]);
    });

    it('fetchTripBlocks: calendarId 未設定なら空をセットする', (done) => {
        TrainDiagramStore.setCalendarId(null);

        service.fetchTripBlocks().subscribe(() => {
            expect(TrainDiagramStore.tripBlocksByDirection).toEqual({});
            done();
        });
    });

    it('fetchTripBlocks: 項目を絞って取り、種別の一覧から種別を補ってストアへ設定する', (done) => {
        TrainDiagramStore.setCalendarId('cal-1');
        TrainDiagramStore.setTripClasses([
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
                TrainDiagramStore.tripBlocksByDirection[0][0].trips?.[0]
                    .tripClass?.tripClassName,
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
            expect(
                TrainDiagramStore.networkStations.map((s) => s.stationId),
            ).toEqual(['s1', 's2']);
            done();
        });
    });

    it('fetchNetworkStations 後、駅軸（stationAxis$）は取得済み tripBlocks から比例配分で算出される', (done) => {
        TrainDiagramStore.setTripBlocksByDirection({
            0: [representativeTrip as any],
            1: [],
        });
        // 本来は train-diagram.component.ts が RouteStationListStateQuery.routeStations$ から
        // 別途設定する（選択路線フィルタと buildStationAxis の接続駅複製判定に必要）。
        TrainDiagramStore.setRouteStations([
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
        TrainDiagramStore.setSelectedRouteIds(['r1']);

        service.fetchNetworkStations().subscribe(() => {
            TrainDiagramStore.stationAxis$.subscribe((axis) => {
                // 代表各停 1 本の times から駅間 10 分が導出され、駅軸に反映される
                expect(axis && stationToY('s1', axis)).toBe(0);
                expect(axis && stationToY('s2', axis)).toBe(10);
                done();
            });
        });
    });
});
