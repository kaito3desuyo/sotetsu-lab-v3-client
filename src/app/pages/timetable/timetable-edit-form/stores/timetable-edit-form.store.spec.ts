import { TestBed } from '@angular/core/testing';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { ETimetableEditFormMode } from '../enums/timetable-edit-form.enum';
import { TimetableEditFormStore } from './timetable-edit-form.store';

function makeStation(stationName: string, routeIds: string[]): any {
    return {
        stationId: stationName,
        stationName,
        routeStationLists: routeIds.map((routeId) => ({
            route: { routeId },
        })),
    };
}

describe('TimetableEditFormStore', () => {
    const stations: StationDetailsDto[] = [
        makeStation('横浜', ['本線']),
        makeStation('二俣川', ['本線', 'いずみ野線']),
        makeStation('湘南台', ['いずみ野線']),
    ];

    let store: InstanceType<typeof TimetableEditFormStore>;

    beforeEach(() => {
        store = TestBed.inject(TimetableEditFormStore);
        store.setStations(stations);
        store.setTripDirection(ETripDirection.OUTBOUND);
        store.setSelectedRouteIds(['本線', 'いずみ野線']);
        store.setTargetTripBlock(null);
        store.setTripBlockId(null);
        store.setMode(null);
    });

    it('setMode/getter が同期して読み書きできる', () => {
        store.setMode(ETimetableEditFormMode.COPY);
        expect(store.mode()).toBe(ETimetableEditFormMode.COPY);
    });

    it('OUTBOUND（下り）は駅の並び順をそのまま維持する', () => {
        const result = store.sortedStations();
        expect(result.map((s) => s.stationId)).toEqual([
            '横浜',
            '二俣川',
            '湘南台',
        ]);
    });

    it('INBOUND（上り）は駅の並び順を反転する', () => {
        store.setTripDirection(ETripDirection.INBOUND);
        const result = store.sortedStations();
        expect(result.map((s) => s.stationId)).toEqual([
            '湘南台',
            '二俣川',
            '横浜',
        ]);
    });

    it('B8-1: 選択路線チップで表示対象駅を絞り込む（情報は削減せず表示のみ絞る）', () => {
        store.setSelectedRouteIds(['いずみ野線']);
        const result = store.sortedVisibleStations();
        expect(result.map((s) => s.stationId)).toEqual(['二俣川', '湘南台']);
    });

    it('trips は targetTripBlock 未設定時に空配列', () => {
        const result = store.trips();
        expect(result).toEqual([]);
    });

    it('B8-3: targetTripBlock 設定時、そのブロック内の全 trips がプリフィル対象になる', () => {
        const tripBlock: TripBlockDetailsDto = {
            tripBlockId: 'block-1',
            trips: [
                {
                    tripId: 'trip-2',
                    times: [
                        {
                            timeId: 't1',
                            stopSequence: 1,
                            departureTime: '10:10:00',
                            departureDays: 1,
                        },
                    ],
                } as any,
                {
                    tripId: 'trip-1',
                    times: [
                        {
                            timeId: 't2',
                            stopSequence: 1,
                            departureTime: '10:00:00',
                            departureDays: 1,
                        },
                    ],
                } as any,
            ],
        };

        store.setTargetTripBlock(tripBlock);

        const result = store.trips();
        expect(result.map((t) => t.tripId)).toEqual(['trip-1', 'trip-2']);
    });

    it('resetForNewSession はモード横断の選択状態（コピー元・絞り込み等）をクリアする', () => {
        store.setTripBlockId('some-block');
        store.setSelectedRouteIds(['本線']);
        store.setIsSaveTripsIndividually(true);
        store.setTripDirection(ETripDirection.INBOUND);

        store.resetForNewSession();

        expect(store.tripDirection()).toBeNull();
        expect(store.tripBlockId()).toBeNull();
        expect(store.selectedRouteIds()).toEqual([]);
        expect(store.isSaveTripsIndividually()).toBe(false);
    });

    it('addSelectedRouteIds は選択中の路線に重複なく足す', () => {
        store.setSelectedRouteIds(['本線']);

        store.addSelectedRouteIds(['本線', 'いずみ野線']);

        expect(store.selectedRouteIds()).toEqual(['本線', 'いずみ野線']);
    });

    it('enableLoading / disableLoading で isLoading が切り替わり、resetLoading で空になる', () => {
        expect(store.isLoading()).toBe(false);

        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('nextFetchSeq は 1 ずつ増え、isLatestFetch は最新の番号だけ true', () => {
        const first = store.nextFetchSeq();
        const second = store.nextFetchSeq();

        expect(second).toBe(first + 1);
        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });
});
