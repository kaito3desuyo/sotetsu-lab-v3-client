import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
    standalone: true,
    selector: 'app-operation-real-time-main-c',
    templateUrl: './operation-real-time-main-c.component.html',
    styleUrls: ['./operation-real-time-main-c.component.scss'],
    imports: [
        CommonModule,
        AdsenseModule,
        OperationPostCardModule,
        OperationRealTimeControlPanelCComponent,
        OperationRealTimeNewTableByOperationCComponent,
        OperationRealTimeNewTableByFormationCComponent,
        OperationRealTimeLegendPComponent,
    ],
    providers: [RxState],
})
export class OperationRealTimeMainCComponent {
    private readonly notification = inject(NotificationService);
    private readonly state = inject(RxState);
    private readonly socketService = inject(SocketService);
    private readonly operationRealTimeService = inject(
        OperationRealTimeService
    );
    private readonly operationPostCardService = inject(
        OperationPostCardService
    );
    private readonly operationRealTimeStateQuery = inject(
        OperationRealTimeStateQuery
    );

    constructor() {
        // 1分ごとに現在位置を更新
        this.state.hold(
            interval(1000 * 60).pipe(
                switchMap(
                    () => this.operationRealTimeStateQuery.isEnableAutoReload$
                ),
                filter((bool) => !!bool),
                switchMap(() =>
                    this.operationRealTimeService.fetchOperationCurrentPosition()
                )
            )
        );

        // 自分が運用目撃情報を投稿したとき
        this.state.hold(
            this.operationPostCardService
                .receiveSubmitOperationSightingEvent()
                .pipe(
                    switchMap(() =>
                        forkJoin([
                            this.operationRealTimeService.fetchOperationSightings(),
                            this.operationRealTimeService.fetchFormationSightings(),
                        ])
                    )
                )
        );

        // 他人が運用目撃情報を投稿したとき
        this.state.hold(
            this.socketService.on().pipe(
                switchMap(() => {
                    if (!this.operationRealTimeStateQuery.isEnableAutoReload) {
                        return of(null);
                    }

                    return forkJoin([
                        this.operationRealTimeService.fetchOperationSightings(),
                        this.operationRealTimeService.fetchFormationSightings(),
                    ]).pipe(
                        tap(() => {
                            this.notification.open(
                                'データが更新されました',
                                'OK'
                            );
                        })
                    );
                })
            )
        );
    }
}
