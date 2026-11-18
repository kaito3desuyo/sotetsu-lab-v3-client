import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OperationDayRow } from '../../utils/operation-day.util';
import { TimetableOperationTripListComponent } from './timetable-operation-trip-list.component';

const trip = (
    id: string,
    over: Partial<Extract<OperationDayRow, { kind: 'trip' }>> = {},
) =>
    ({
        kind: 'trip',
        trip: {
            tripOperationListId: id,
            startStationId: 'a',
            endStationId: 'b',
            startTime: {
                timeId: 's',
                departureDays: 2,
                departureTime: '00:47:00',
            },
            endTime: { timeId: 'e', arrivalDays: 2, arrivalTime: '01:04:00' },
            trip: {
                tripId: `x-${id}`,
                tripNumber: '7711',
                tripClass: { tripClassId: 'c', tripClassName: '各停' },
                times: [
                    {
                        timeId: '1',
                        stationId: 'a',
                        stopSequence: 1,
                        pickupType: 0,
                        dropoffType: 0,
                        departureDays: 2,
                        departureTime: '00:47:00',
                    },
                ],
            },
        },
        formationNumber: '8708',
        inferred: false,
        sightingTimes: [],
        ...over,
    }) as OperationDayRow;

function create(
    rows: OperationDayRow[],
    wide = false,
): ComponentFixture<TimetableOperationTripListComponent> {
    TestBed.configureTestingModule({
        imports: [TimetableOperationTripListComponent],
        providers: [
            provideRouter([]),
            {
                provide: BreakpointObserver,
                useValue: {
                    observe: () => of({ matches: wide, breakpoints: {} }),
                },
            },
        ],
    });
    const fixture = TestBed.createComponent(
        TimetableOperationTripListComponent,
    );
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput(
        'states',
        rows.map(() => 'future'),
    );
    fixture.componentRef.setInput('stationNames', {
        a: '二俣川',
        b: '湘南台',
    });
    fixture.componentRef.setInput('date', '2026-11-16');
    fixture.detectChanges();
    return fixture;
}
const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const formationCells = (f: ComponentFixture<unknown>) =>
    [...el(f).querySelectorAll('[data-testid="trip-formation"]')].map((n) =>
        (n.textContent ?? '').replace(/\s+/g, ''),
    );

describe('TimetableOperationTripListComponent', () => {
    it('列車の行に編成番号を出し、その日の編成別時刻表へのリンクにする', () => {
        const f = create([trip('t1')]);
        expect(formationCells(f)).toEqual(['8708']);
        const a = el(f).querySelector<HTMLAnchorElement>(
            '[data-testid="trip-formation"] a',
        );
        expect(a?.getAttribute('href')).toBe(
            '/timetable/formation;formation_number=8708;date=2026-11-16',
        );
    });

    it('推し量りの編成には「?」を付け、分からなければ空ける', () => {
        const f = create([
            trip('t1', { inferred: true }),
            trip('t2', { formationNumber: null }),
        ]);
        expect(formationCells(f)).toEqual(['8708?', '']);
    });

    it('時刻は 24 時を過ぎても時計の時刻で出す', () => {
        const f = create([trip('t1')]);
        expect(el(f)).toHaveTextContent(/00:47/);
        expect(el(f)).not.toHaveTextContent(/24:47/);
    });

    it('差し替わりの行に「の目撃により」「に差し替え」と編成番号のリンクを出す', () => {
        const f = create([
            trip('t1'),
            {
                kind: 'swap',
                sightingTime: '2026-11-16T14:21:00+09:00',
                toFormationNumber: '10701',
            },
            trip('t2', { formationNumber: '10701' }),
        ]);
        const swap = el(f).querySelector('[data-testid="swap-row"]');
        // 語の間は flex の gap で空けるので、字だけを比べる
        expect(swap?.textContent?.replace(/\s+/g, '')).toBe(
            '14:21の目撃により10701に差し替え',
        );
        expect(swap?.querySelector('a')?.getAttribute('href')).toBe(
            '/timetable/formation;formation_number=10701;date=2026-11-16',
        );
    });

    it('乗り移りの行に駅と 2 つの運用番号を出し、運用番号を見ている日の運用別時刻表へのリンクにする', () => {
        const f = create([
            trip('t1'),
            { kind: 'transfer', from: '29K', to: '30K', stationId: 'b' },
        ]);
        const row = el(f).querySelector('[data-testid="transfer-row"]');
        expect(row?.textContent?.replace(/\s+/g, '')).toBe(
            '□湘南台で運番変更29K→30K',
        );
        expect(
            Array.from(row?.querySelectorAll('a') ?? []).map((a) =>
                a.getAttribute('href'),
            ),
        ).toEqual([
            '/timetable/operation;operation_number=29K;date=2026-11-16',
            '/timetable/operation;operation_number=30K;date=2026-11-16',
        ]);
    });

    it('ダイヤの形では、乗り移りの運用番号をそのダイヤの運用別時刻表へのリンクにする', () => {
        const f = create([
            { kind: 'transfer', from: '29K', to: '30K', stationId: 'b' },
        ]);
        f.componentRef.setInput('date', null);
        f.componentRef.setInput('calendarId', 'cal-1');
        f.detectChanges();
        const href = el(f)
            .querySelector('[data-testid="transfer-row"] a')
            ?.getAttribute('href');
        expect(href).toBe(
            '/timetable/operation;operation_number=29K;calendar_id=cal-1',
        );
    });

    it('目撃のある列車に「目撃 HH:mm」を出す', () => {
        const f = create([
            trip('t1', { sightingTimes: ['2026-11-17T00:46:00+09:00'] }),
        ]);
        expect(
            el(f).querySelector('[data-testid="sighted-label"]')?.textContent,
        ).toContain('目撃 00:46');
    });

    it('狭い画面は行を押すと行の中に各駅の時刻を開く', () => {
        const f = create([trip('t1')]);
        el(f)
            .querySelector<HTMLButtonElement>('button[aria-expanded]')!
            .click();
        f.detectChanges();
        expect(
            el(f).querySelector('li [data-testid="trip-times"]'),
        ).not.toBeNull();
        expect(el(f).querySelector('[data-testid="trip-detail"]')).toBeNull();
    });

    it('広い画面は押した列車の各駅の時刻を右のカードに出す', () => {
        const f = create([trip('t1')], true);
        const detail = () =>
            el(f).querySelector('[data-testid="trip-detail"]')!;
        expect(detail()).toHaveTextContent(/列車を押すと/);
        el(f)
            .querySelector<HTMLButtonElement>('button[aria-expanded]')!
            .click();
        f.detectChanges();
        expect(
            detail().querySelector('[data-testid="trip-times"]'),
        ).not.toBeNull();
    });
});
