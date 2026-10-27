import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { FeatureFlagState } from 'src/app/global-states/feature-flag.state';
import { InitializeState } from 'src/app/global-states/initialize.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListState } from 'src/app/global-states/todays-operation-list.state';
import { TokenState } from 'src/app/global-states/token.state';
import { UserState } from 'src/app/global-states/user.state';
import { preloadRouteComponents } from './preload-route-components';

export const initialDataResolver: ResolveFn<boolean> = async (route, state) => {
    const tokenState = inject(TokenState);
    const userState = inject(UserState);
    const agencyListState = inject(AgencyListState);
    const calendarListState = inject(CalendarListState);
    const routeStationListState = inject(RouteStationListState);
    const serviceListState = inject(ServiceListState);
    const todaysCalendarListState = inject(TodaysCalendarListState);
    const todaysOperationListState = inject(TodaysOperationListState);
    const todaysFormationListState = inject(TodaysFormationListState);
    const featureFlagState = inject(FeatureFlagState);
    const initializeState = inject(InitializeState);
    // サーバーはゲストとして描き、HTML を CDN に置く。プロフィールと「今日」のものは
    // 人や日で変わるので取らない（spec 5.2・5.3）。ブラウザで起動した後に取る
    const isServer = isPlatformServer(inject(PLATFORM_ID));

    // router は resolver の後で loadComponent を呼ぶので、ページの chunk を先に取り始めておく
    preloadRouteComponents(state.root);

    // 画面を移るたびに確かめる（使っている途中のログイン切れに気づくため）。
    // 開いた直後の replaceUrl で二度走らないよう、ROUTE_CHECK_MAX_AGE_MS の間は使い回す。
    // トークンは保存されないので、API の要求より先に取る（認証ヘッダーのため）
    await Promise.all([
        lastValueFrom(tokenState.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS })),
        ...(isServer
            ? []
            : [
                  lastValueFrom(
                      userState.fetch({
                          maxAgeMs: ROUTE_CHECK_MAX_AGE_MS,
                      }),
                  ),
              ]),
    ]);

    // 順番待ちが要るのは今日の運用だけ（今日のダイヤの ID で引く）。ほかは同時に投げる
    await Promise.all([
        lastValueFrom(agencyListState.fetch()),
        lastValueFrom(calendarListState.fetch()),
        lastValueFrom(routeStationListState.fetch()),
        lastValueFrom(serviceListState.fetch()),
        // 失敗しても止まらない（FeatureFlagState が飲む）。60 秒は query が使い回す
        lastValueFrom(featureFlagState.fetch()),
        ...(isServer
            ? []
            : [
                  lastValueFrom(todaysFormationListState.fetch()),
                  (async () => {
                      await lastValueFrom(todaysCalendarListState.fetch());
                      await lastValueFrom(todaysOperationListState.fetch());
                  })(),
              ]),
    ]);

    initializeState.markInitialized();

    return true;
};
