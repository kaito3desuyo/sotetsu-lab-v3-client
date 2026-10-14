import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
import { AgencyListStateStore } from 'src/app/global-states/agency-list.state';
import { CalendarListStateStore } from 'src/app/global-states/calendar-list.state';
import { InitializeStateStore } from 'src/app/global-states/initialize.state';
import { RouteStationListStateStore } from 'src/app/global-states/route-station-list.state';
import { ServiceListStateStore } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListStateStore } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListStateStore } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateStore } from 'src/app/global-states/todays-operation-list.state';
import { TokenStateStore } from 'src/app/global-states/token.state';
import { UserStateStore } from 'src/app/global-states/user.state';

export const initialDataResolver: ResolveFn<boolean> = async (route, state) => {
    const tokenStateStore = inject(TokenStateStore);
    const userStateStore = inject(UserStateStore);
    const agencyListStateStore = inject(AgencyListStateStore);
    const calendarListStateStore = inject(CalendarListStateStore);
    const routeStationListStateStore = inject(RouteStationListStateStore);
    const serviceListStateStore = inject(ServiceListStateStore);
    const todaysCalendarListStateStore = inject(TodaysCalendarListStateStore);
    const todaysOperationListStateStore = inject(TodaysOperationListStateStore);
    const todaysFormationListStateStore = inject(TodaysFormationListStateStore);
    const initializeStateStore = inject(InitializeStateStore);

    // 画面を移るたびに確かめる（使っている途中のログイン切れに気づくため）。
    // 開いた直後の replaceUrl で二度走らないよう、ROUTE_CHECK_MAX_AGE_MS の間は使い回す。
    // トークンは保存されないので、API の要求より先に取る（認証ヘッダーのため）
    await Promise.all([
        lastValueFrom(
            tokenStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
        ),
        lastValueFrom(
            userStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
        ),
    ]);

    // 順番待ちが要るのは今日の運用だけ（今日のダイヤの ID で引く）。ほかは同時に投げる
    await Promise.all([
        lastValueFrom(agencyListStateStore.fetch()),
        lastValueFrom(calendarListStateStore.fetch()),
        lastValueFrom(routeStationListStateStore.fetch()),
        lastValueFrom(serviceListStateStore.fetch()),
        lastValueFrom(todaysFormationListStateStore.fetch()),
        (async () => {
            await lastValueFrom(todaysCalendarListStateStore.fetch());
            await lastValueFrom(todaysOperationListStateStore.fetch());
        })(),
    ]);

    initializeStateStore.markInitialized();

    return true;
};
