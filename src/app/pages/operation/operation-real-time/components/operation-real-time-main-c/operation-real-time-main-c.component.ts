import { Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { forkJoin, of, Subject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { NotificationService } from 'src/app/general/services/notification.service';
import { SocketService } from 'src/app/general/services/socket.service';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/services/operation-post-card.service';
import { OperationRealTimeService } from '../../general/services/operation-real-time.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../../states/operation-real-time.state';

@Component({
    selector: 'app-operation-real-time-main-c',
    templateUrl: './operation-real-time-main-c.component.html',
    styleUrls: ['./operation-real-time-main-c.component.scss'],
    providers: [RxState],
})
export class OperationRealTimeMainCComponent {
    readonly operations$ = this.operationRealTimeStateQuery.operations$;
    readonly formations$ = this.operationRealTimeStateQuery.formations$;
    readonly latestOperationSightings$ =
        this.operationRealTimeStateQuery.latestSightings$.pipe(
            map((o) => o.operationSightings)
        );
    readonly latestFormationSightings$ =
        this.operationRealTimeStateQuery.latestSightings$.pipe(
            map((o) => o.formationSightings)
        );
    readonly currentPositions$ =
        this.operationRealTimeStateQuery.currentPositions$;
    readonly todaysCalendarId$ =
        this.todaysCalendarListStateQuery.todaysCalendarId$;
    readonly stations$ = this.routeStationListStateQuery.stations$;
    readonly tripClasses$ = this.operationRealTimeStateQuery.tripClasses$;
    readonly isEnableAutoReload$ =
        this.operationRealTimeStateQuery.isEnableAutoReload$;
    readonly isVisibleCurrentPosition$ =
        this.operationRealTimeStateQuery.isVisibleCurrentPosition$;

    readonly onToggledAutoReload$ = new Subject<boolean>();
    readonly onToggledVisibleCurrentPosition$ = new Subject<boolean>();

    constructor(
        private readonly notification: NotificationService,
        private readonly state: RxState<{}>,
        private readonly socketService: SocketService,
        private readonly operationRealTimeService: OperationRealTimeService,
        private readonly operationPostCardService: OperationPostCardService,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly routeStationListStateQuery: RouteStationListStateQuery,
        private readonly operationRealTimeStateStore: OperationRealTimeStateStore,
        private readonly operationRealTimeStateQuery: OperationRealTimeStateQuery
    ) {
        this.state.hold(this.onToggledAutoReload$, (bool) => {
            this.operationRealTimeStateStore.setIsEnableAutoReload(bool);
        });

        this.state.hold(this.onToggledVisibleCurrentPosition$, (bool) => {
            this.operationRealTimeStateStore.setIsVisibleCurrentPosition(bool);
        });

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
