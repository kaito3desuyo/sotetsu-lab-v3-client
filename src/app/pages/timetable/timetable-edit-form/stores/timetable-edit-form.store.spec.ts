import { firstValueFrom } from 'rxjs';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';
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

    beforeEach(() => {
        TimetableEditFormStore.setStations(stations);
        TimetableEditFormStore.setTripDirection(ETripDirection.OUTBOUND);
        TimetableEditFormStore.setSelectedRouteIds(['本線', 'いずみ野線']);
        TimetableEditFormStore.setTargetTripBlock(null);
        TimetableEditFormStore.setTripBlockId(null);
        TimetableEditFormStore.setMode(null);
    });

    it('setMode/getter が同期して読み書きできる', () => {
        TimetableEditFormStore.setMode(ETimetableEditFormMode.COPY);
        expect(TimetableEditFormStore.mode).toBe(ETimetableEditFormMode.COPY);
    });

    it('OUTBOUND（下り）は駅の並び順をそのまま維持する', async () => {
        const result = await firstValueFrom(
            TimetableEditFormStore.sortedStations$,
        );
        expect(result.map((s) => s.stationId)).toEqual([
            '横浜',
            '二俣川',
            '湘南台',
        ]);
    });

    it('INBOUND（上り）は駅の並び順を反転する', async () => {
        TimetableEditFormStore.setTripDirection(ETripDirection.INBOUND);
        const result = await firstValueFrom(
            TimetableEditFormStore.sortedStations$,
        );
        expect(result.map((s) => s.stationId)).toEqual([
            '湘南台',
            '二俣川',
            '横浜',
        ]);
    });

    it('B8-1: 選択路線チップで表示対象駅を絞り込む（情報は削減せず表示のみ絞る）', async () => {
        TimetableEditFormStore.setSelectedRouteIds(['いずみ野線']);
        const result = await firstValueFrom(
            TimetableEditFormStore.sortedVisibleStations$,
        );
        expect(result.map((s) => s.stationId)).toEqual(['二俣川', '湘南台']);
    });

    it('trips$ は targetTripBlock 未設定時に空配列', async () => {
        const result = await firstValueFrom(TimetableEditFormStore.trips$);
        expect(result).toEqual([]);
    });

    it('B8-3: targetTripBlock 設定時、そのブロック内の全 trips がプリフィル対象になる', async () => {
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

        TimetableEditFormStore.setTargetTripBlock(tripBlock);

        const result = await firstValueFrom(TimetableEditFormStore.trips$);
        expect(result.map((t) => t.tripId)).toEqual(['trip-1', 'trip-2']);
    });

    it('resetForNewSession はモード横断の選択状態（コピー元・絞り込み等）をクリアする', () => {
        TimetableEditFormStore.setTripBlockId('some-block');
        TimetableEditFormStore.setSelectedRouteIds(['本線']);
        TimetableEditFormStore.setIsSaveTripsIndividually(true);

        TimetableEditFormStore.resetForNewSession();

        expect(TimetableEditFormStore.tripBlockId).toBeNull();
        expect(TimetableEditFormStore.selectedRouteIds).toEqual([]);
        expect(TimetableEditFormStore.isSaveTripsIndividually).toBe(false);
    });
});
