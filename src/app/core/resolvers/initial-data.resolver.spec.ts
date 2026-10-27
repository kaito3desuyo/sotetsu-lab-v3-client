import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
} from '@angular/router';
import { Subject } from 'rxjs';
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
import { AgencyListStateStore } from 'src/app/global-states/agency-list.state';
import { CalendarListStateStore } from 'src/app/global-states/calendar-list.state';
import { FeatureFlagState } from 'src/app/global-states/feature-flag.state';
import { InitializeState } from 'src/app/global-states/initialize.state';
import { RouteStationListStateStore } from 'src/app/global-states/route-station-list.state';
import { ServiceListStateStore } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListStateStore } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListStateStore } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateStore } from 'src/app/global-states/todays-operation-list.state';
import { TokenState } from 'src/app/global-states/token.state';
import { UserState } from 'src/app/global-states/user.state';
import { initialDataResolver } from './initial-data.resolver';

type Stub = { fetch: jest.Mock; subject: Subject<void> };

function stub(): Stub {
    const subject = new Subject<void>();
    return { subject, fetch: jest.fn(() => subject) };
}

function done(s: Stub): void {
    s.subject.next();
    s.subject.complete();
}

/** await の続きを流す */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('initialDataResolver', () => {
    let token: Stub;
    let user: Stub;
    let agency: Stub;
    let calendar: Stub;
    let routeStation: Stub;
    let service: Stub;
    let todaysCalendar: Stub;
    let todaysOperation: Stub;
    let todaysFormation: Stub;
    let featureFlag: Stub;
    let markInitialized: jest.Mock;

    beforeEach(() => {
        [
            token,
            user,
            agency,
            calendar,
            routeStation,
            service,
            todaysCalendar,
            todaysOperation,
            todaysFormation,
            featureFlag,
        ] = Array.from({ length: 10 }, stub);
        markInitialized = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: TokenState, useValue: token },
                { provide: UserState, useValue: user },
                { provide: AgencyListStateStore, useValue: agency },
                { provide: CalendarListStateStore, useValue: calendar },
                { provide: RouteStationListStateStore, useValue: routeStation },
                { provide: ServiceListStateStore, useValue: service },
                {
                    provide: TodaysCalendarListStateStore,
                    useValue: todaysCalendar,
                },
                {
                    provide: TodaysOperationListStateStore,
                    useValue: todaysOperation,
                },
                {
                    provide: TodaysFormationListStateStore,
                    useValue: todaysFormation,
                },
                { provide: FeatureFlagState, useValue: featureFlag },
                {
                    provide: InitializeState,
                    useValue: { markInitialized },
                },
            ],
        });
    });

    function run(
        state: RouterStateSnapshot = {
            root: { routeConfig: null, children: [] },
        } as unknown as RouterStateSnapshot,
    ): Promise<boolean> {
        return TestBed.runInInjectionContext(() =>
            initialDataResolver({} as ActivatedRouteSnapshot, state),
        ) as Promise<boolean>;
    }

    it('token・profile を待たずに、行き先のページの loadComponent を呼ぶ', () => {
        const loadComponent = jest.fn(() => Promise.resolve(class {}));

        run({
            root: {
                routeConfig: null,
                children: [
                    {
                        routeConfig: { path: '', loadComponent },
                        children: [],
                    },
                ],
            },
        } as unknown as RouterStateSnapshot);

        expect(loadComponent).toHaveBeenCalledTimes(1);
        expect(agency.fetch).not.toHaveBeenCalled();
    });

    it('token・profile には ROUTE_CHECK_MAX_AGE_MS を渡す', () => {
        run();

        expect(token.fetch).toHaveBeenCalledWith({
            maxAgeMs: ROUTE_CHECK_MAX_AGE_MS,
        });
        expect(user.fetch).toHaveBeenCalledWith({
            maxAgeMs: ROUTE_CHECK_MAX_AGE_MS,
        });
    });

    it('2 段目は token・profile が終わるまで呼ばれない', async () => {
        run();
        done(token);
        await flush();

        expect(agency.fetch).not.toHaveBeenCalled();
        expect(todaysCalendar.fetch).not.toHaveBeenCalled();
    });

    it('token・profile の後、今日の運用以外は今日のダイヤを待たずに同時に呼ばれる', async () => {
        run();
        done(token);
        done(user);
        await flush();

        for (const s of [
            agency,
            calendar,
            routeStation,
            service,
            todaysCalendar,
            todaysFormation,
            featureFlag,
        ]) {
            expect(s.fetch).toHaveBeenCalledTimes(1);
        }
        expect(todaysOperation.fetch).not.toHaveBeenCalled();
    });

    it('フィーチャーフラグは 2 段目で取り、token・profile が終わるまで呼ばれない', async () => {
        run();
        done(token);
        await flush();
        expect(featureFlag.fetch).not.toHaveBeenCalled();

        done(user);
        await flush();
        expect(featureFlag.fetch).toHaveBeenCalledTimes(1);
    });

    it('今日の運用は、今日のダイヤが届いたら呼ばれる', async () => {
        run();
        done(token);
        done(user);
        await flush();
        done(todaysCalendar);
        await flush();

        expect(todaysOperation.fetch).toHaveBeenCalledTimes(1);
    });

    it('全部そろったら markInitialized して true を返す', async () => {
        const result = run();
        done(token);
        done(user);
        await flush();
        for (const s of [
            agency,
            calendar,
            routeStation,
            service,
            todaysCalendar,
            todaysFormation,
            featureFlag,
        ]) {
            done(s);
        }
        await flush();
        expect(markInitialized).not.toHaveBeenCalled();
        done(todaysOperation);

        expect(await result).toBe(true);
        expect(markInitialized).toHaveBeenCalledTimes(1);
    });

    describe('サーバー', () => {
        beforeEach(() => {
            TestBed.configureTestingModule({
                providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
            });
        });

        it('プロフィールと今日のものは取らず、トークンと改正でしか変わらないものは取る', async () => {
            const result = run();

            await flush();
            done(token);
            await flush();
            [agency, calendar, routeStation, service, featureFlag].forEach(
                done,
            );

            expect(await result).toBe(true);
            expect(user.fetch).not.toHaveBeenCalled();
            expect(todaysCalendar.fetch).not.toHaveBeenCalled();
            expect(todaysOperation.fetch).not.toHaveBeenCalled();
            expect(todaysFormation.fetch).not.toHaveBeenCalled();
            expect(token.fetch).toHaveBeenCalledTimes(1);
            expect(markInitialized).toHaveBeenCalledTimes(1);
        });
    });
});
