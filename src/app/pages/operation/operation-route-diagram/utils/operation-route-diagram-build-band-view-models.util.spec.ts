import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { buildBandViewModels } from './operation-route-diagram-build-band-view-models.util';

function station(stationId: string, stationName: string): StationDetailsDto {
    return { stationId, stationName } as StationDetailsDto;
}

const stations = [
    station('s-yokohama', '横浜'),
    station('s-hoshikawa', '星川'),
    station('s-ebina', '海老名'),
];

function tripOperationList(
    overrides: Record<string, unknown> = {},
): TripOperationListDetailsDto {
    return {
        tripOperationListId: 'tol-1',
        startTime: {
            stationId: 's-yokohama',
            departureTime: '05:45:00',
        },
        endTime: {
            stationId: 's-ebina',
            arrivalTime: '06:40:00',
        },
        trip: {
            tripId: 'trip-1',
            tripNumber: '5001',
            tripBlockId: 'block-1',
            tripDirection: 0,
            depotOut: false,
            depotIn: false,
            tripClass: {
                tripClassId: 'tc-1',
                tripClassName: '急行',
                tripClassColor: '#001556',
            },
        },
        ...overrides,
    } as TripOperationListDetailsDto;
}

describe('buildBandViewModels', () => {
    it('startIndex < endIndex のとき、start が左端・end が右端になる', () => {
        const [vm] = buildBandViewModels([tripOperationList()], stations);

        expect(vm.leftIndex).toBe(0);
        expect(vm.rightIndex).toBe(2);
        expect(vm.leftTime).toBe('05:45:00');
        expect(vm.rightTime).toBe('06:40:00');
    });

    it('startIndex > endIndex（上り方向）のとき、end が左端・start が右端になり、時刻もそれに追従する', () => {
        const [vm] = buildBandViewModels(
            [
                tripOperationList({
                    startTime: {
                        stationId: 's-ebina',
                        departureTime: '07:52:00',
                    },
                    endTime: {
                        stationId: 's-yokohama',
                        arrivalTime: '08:55:00',
                    },
                }),
            ],
            stations,
        );

        expect(vm.leftIndex).toBe(0);
        expect(vm.rightIndex).toBe(2);
        expect(vm.leftTime).toBe('08:55:00');
        expect(vm.rightTime).toBe('07:52:00');
    });

    it('行先は常に endTime の駅名になる', () => {
        const [vm] = buildBandViewModels([tripOperationList()], stations);
        expect(vm.destinationStationName).toBe('海老名');
    });

    it('種別名は系統サフィックスを除いたベース名になる', () => {
        const [vm] = buildBandViewModels(
            [
                tripOperationList({
                    trip: {
                        ...tripOperationList().trip,
                        tripClass: {
                            tripClassId: 'tc-1',
                            tripClassName: '急行（SO→TY）',
                            tripClassColor: '#001556',
                        },
                    },
                }),
            ],
            stations,
        );
        expect(vm.tripClassName).toBe('急行');
    });

    it('急行/特急・快速等はすべて standard、回送のみ nonRevenue に分類される', () => {
        const [express, standard, nonRevenue] = buildBandViewModels(
            [
                tripOperationList({
                    tripOperationListId: 'tol-express',
                    trip: {
                        ...tripOperationList().trip,
                        tripClass: {
                            tripClassId: 'tc-1',
                            tripClassName: '急行',
                            tripClassColor: '#001556',
                        },
                    },
                }),
                tripOperationList({
                    tripOperationListId: 'tol-standard',
                    trip: {
                        ...tripOperationList().trip,
                        tripClass: {
                            tripClassId: 'tc-2',
                            tripClassName: '快速',
                            tripClassColor: '#1d88e2',
                        },
                    },
                }),
                tripOperationList({
                    tripOperationListId: 'tol-nonrevenue',
                    trip: {
                        ...tripOperationList().trip,
                        tripClass: {
                            tripClassId: 'tc-3',
                            tripClassName: '回送',
                            tripClassColor: '#9e9e9e',
                        },
                    },
                }),
            ],
            stations,
        );

        expect(express.style).toBe('standard');
        expect(standard.style).toBe('standard');
        expect(nonRevenue.style).toBe('nonRevenue');
    });

    it('tripClassColor をそのまま color に使う（ハードコード禁止）', () => {
        const [vm] = buildBandViewModels([tripOperationList()], stations);
        expect(vm.color).toBe('#001556');
    });

    it('tripClass が欠落してもフォールバック色を返し例外を投げない', () => {
        const [vm] = buildBandViewModels(
            [tripOperationList({ trip: { ...tripOperationList().trip, tripClass: undefined } })],
            stations,
        );
        expect(vm.color).toBe('#666666');
        expect(vm.style).toBe('standard');
    });

    it('depotOut/depotIn フラグと index を trip からそのまま引き継ぐ', () => {
        const [vm] = buildBandViewModels(
            [
                tripOperationList({
                    trip: {
                        ...tripOperationList().trip,
                        depotOut: true,
                        depotIn: false,
                    },
                }),
            ],
            stations,
        );

        expect(vm.depotOut).toBe(true);
        expect(vm.depotIn).toBe(false);
        expect(vm.depotOutIndex).toBe(0);
        expect(vm.depotInIndex).toBe(2);
    });

    it('駅リストに存在しない stationId は index 0 にフォールバックする（reconnect 済み前提だが防御的に処理する）', () => {
        const [vm] = buildBandViewModels(
            [
                tripOperationList({
                    startTime: { stationId: 'unknown', departureTime: '05:00:00' },
                }),
            ],
            stations,
        );

        expect(vm.leftIndex).toBe(0);
    });

    it('99文書追補7 §5（P9-9）: 回送の tripNumber は「回」を前置せず素の数字のまま返す（「回送」の語は表示側で別に前置する）', () => {
        const [vm] = buildBandViewModels(
            [
                tripOperationList({
                    trip: {
                        ...tripOperationList().trip,
                        tripNumber: '9432',
                        tripClass: {
                            tripClassId: 'tc-3',
                            tripClassName: '回送',
                            tripClassColor: '#9e9e9e',
                        },
                    },
                }),
            ],
            stations,
        );
        expect(vm.tripNumber).toBe('9432');
    });

    it('99文書追補7 §5（P9-9）: 回送で tripNumber に既に「回」が含まれる場合は取り除く（表示側の「回送」と二重表記にしないため）', () => {
        const [vm] = buildBandViewModels(
            [
                tripOperationList({
                    trip: {
                        ...tripOperationList().trip,
                        tripNumber: '回9301',
                        tripClass: {
                            tripClassId: 'tc-3',
                            tripClassName: '回送',
                            tripClassColor: '#9e9e9e',
                        },
                    },
                }),
            ],
            stations,
        );
        expect(vm.tripNumber).toBe('9301');
    });

    it('旅客列車では tripNumber をそのまま使う（「回」前置はしない）', () => {
        const [vm] = buildBandViewModels([tripOperationList()], stations);
        expect(vm.tripNumber).toBe('5001');
    });

    it('99文書G6-5: depotOutTime は startTime.departureTime、depotInTime は endTime.arrivalTime をそのまま返す', () => {
        const [vm] = buildBandViewModels([tripOperationList()], stations);
        expect(vm.depotOutTime).toBe('05:45:00');
        expect(vm.depotInTime).toBe('06:40:00');
    });
});
