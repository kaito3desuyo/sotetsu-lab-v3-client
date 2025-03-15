import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { AdsenseModule } from 'ng2-adsense';
import { forkJoin, interval, of } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { OperationPostCardModule } from 'src/app/shared/operation-post-card/operation-post-card.module';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/services/operation-post-card.service';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { OperationRealTimeStateQuery } from '../../states/operation-real-time.state';
import { OperationRealTimeControlPanelCComponent } from '../operation-real-time-control-panel-c/operation-real-time-control-panel-c.component';
import { OperationRealTimeLegendPComponent } from '../operation-real-time-legend-p/operation-real-time-legend-p.component';
import { OperationRealTimeNewTableByFormationCComponent } from '../operation-real-time-new-table-by-formation-c/operation-real-time-new-table-by-formation-c.component';
import { OperationRealTimeNewTableByOperationCComponent } from '../operation-real-time-new-table-by-operation-c/operation-real-time-new-table-by-operation-c.component';

@Component({
    selector: 'app-operation-real-time-main-c',
    templateUrl: './operation-real-time-main-c.component.html',
    styleUrls: ['./operation-real-time-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        AdsenseModule,
        OperationPostCardModule,
        OperationRealTimeControlPanelCComponent,
        OperationRealTimeNewTableByOperationCComponent,
        OperationRealTimeNewTableByFormationCComponent,
        OperationRealTimeLegendPComponent,
    ],
    providers: [RxState]
})
export class OperationRealTimeMainCComponent {
    readonly #notification = inject(NotificationService);
    readonly #state = inject(RxState);
    readonly #socketService = inject(SocketService);
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #operationPostCardService = inject(OperationPostCardService);
    readonly #operationRealTimeStateQuery = inject(OperationRealTimeStateQuery);

    constructor() {
        // 1秒ごとに現在位置の更新必要性を判定し、更新対象の運用がある場合は更新する
        this.#state.hold(
            interval(1000 * 1).pipe(
                switchMap(
                    () => this.#operationRealTimeStateQuery.isEnableAutoReload$,
                ),
                filter((bool) => !!bool),
                switchMap(() =>
                    this.#operationRealTimeService.fetchOperationCurrentPosition(),
                ),
            ),
        );

        // 自分が運用目撃情報を投稿したとき
        this.#state.hold(
            this.#operationPostCardService
                .receiveSubmitOperationSightingEvent()
                .pipe(
                    switchMap(() =>
                        forkJoin([
                            this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(),
                            this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(),
                            this.#operationRealTimeService.fetchOperationSightingHistories(),
                            this.#operationRealTimeService.fetchFormationSightingHistories(),
                        ]),
                    ),
                ),
        );

        // 他人が運用目撃情報を投稿したとき
        this.#state.hold(
            this.#socketService.on().pipe(
                switchMap(() => {
                    if (!this.#operationRealTimeStateQuery.isEnableAutoReload) {
                        return of(null);
                    }

                    return forkJoin([
                        this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(),
                        this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(),
                        this.#operationRealTimeService.fetchOperationSightingHistories(),
                        this.#operationRealTimeService.fetchFormationSightingHistories(),
                    ]).pipe(
                        tap(() => {
                            this.#notification.open(
                                'データが更新されました',
                                'OK',
                            );
                        }),
                    );
                }),
            ),
        );
    }
}
