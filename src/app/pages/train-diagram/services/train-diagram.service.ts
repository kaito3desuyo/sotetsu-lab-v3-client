import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TrainDiagramStore } from '../stores/train-diagram.store';

@Injectable()
export class TrainDiagramService {
    readonly #serviceService = inject(ServiceService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);
    readonly #tripClassService = inject(TripClassService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #operationSightingService = inject(OperationSightingService);

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data) => {
                TrainDiagramStore.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    fetchTripBlocks(): Observable<void> {
        const calendarId = TrainDiagramStore.calendarId;

        if (!calendarId) {
            TrainDiagramStore.setTripBlocksByDirection({});
            return of(undefined);
        }

        return this.#tripBlockService
            .findManyByCalendarId({ calendarId })
            .pipe(
                tap((data) => {
                    TrainDiagramStore.setTripBlocksByDirection(data);
                }),
                map(() => undefined),
            );
    }

    /**
     * 網羅駅（全線時刻表と同一の並び順）を取得する。
     * 単一路線ではなくサービス全体の駅を取得するため、serviceId は変わらず
     * ダイヤ・路線絞り込みが変わっても再取得は不要（初回のみ呼び出せばよい）。
     * 駅軸（stationAxis）自体は store 側で選択路線・取得済み tripBlocks から導出される。
     */
    fetchNetworkStations(): Observable<void> {
        const serviceId = this.#serviceListStateQuery.serviceId;

        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                TrainDiagramStore.setNetworkStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    /**
     * タップで選択された列車の充当編成（目撃クロスセクション由来）を取得する。
     * 今日有効なダイヤ表示時のみ呼び出し側（コンポーネント）が呼ぶ。
     */
    fetchOperationSightingTimeCrossSection(operationNumber: string): Observable<void> {
        return this.#operationSightingService
            .findOneTimeCrossSectionByOperationNumber({ operationNumber })
            .pipe(
                tap((data) => {
                    TrainDiagramStore.setOperationSightingTimeCrossSection(
                        operationNumber,
                        data,
                    );
                }),
                map(() => undefined),
            );
    }
}
