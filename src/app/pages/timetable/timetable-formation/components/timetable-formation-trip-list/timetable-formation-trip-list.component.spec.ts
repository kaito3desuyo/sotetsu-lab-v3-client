import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormationDayRow } from '../../utils/formation-day.util';
import { TimetableFormationTripListComponent } from './timetable-formation-trip-list.component';

const trip = (over: Partial<Extract<FormationDayRow, { kind: 'trip' }>> = {}) =>
    ({
        kind: 'trip',
        trip: {
            tripOperationListId: 't1',
            startStationId: 'a',
            endStationId: 'b',
            startTime: {
                timeId: 's',
                departureDays: 1,
                departureTime: '07:07:00',
            },
            endTime: { timeId: 'e', arrivalDays: 1, arrivalTime: '07:14:00' },
            trip: {
                tripId: 'x',
                tripNumber: '2515',
                tripClass: { tripClassId: 'c', tripClassName: '快速' },
                times: [
                    {
                        timeId: '1',
                        stationId: 'a',
                        stopSequence: 1,
                        pickupType: 0,
                        dropoffType: 0,
                        departureDays: 1,
                        departureTime: '07:07:00',
                    },
                    {
                        timeId: '2',
                        stationId: 'c',
                        stopSequence: 2,
                        pickupType: 1,
                        dropoffType: 1,
                    },
                ],
            },
        },
        operationId: 'op',
        operationNumber: '55',
        estimated: false,
        carriedOver: false,
        ...over,
    }) as FormationDayRow;

function create(
    rows: FormationDayRow[],
    states: ('past' | 'running' | 'future')[] = [],
): ComponentFixture<TimetableFormationTripListComponent> {
    TestBed.configureTestingModule({
        imports: [TimetableFormationTripListComponent],
        providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(
        TimetableFormationTripListComponent,
    );
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('states', states);
    fixture.componentRef.setInput('stationNames', {
        a: 'いずみ野',
        b: '湘南台',
        c: '二俣川',
    });
    fixture.detectChanges();
    return fixture;
}
const text = (f: ComponentFixture<unknown>): string =>
    (f.nativeElement as HTMLElement).textContent ?? '';

describe('TimetableFormationTripListComponent', () => {
    it('始発と終着の駅名と時刻を出し、走っている列車に印を付ける', () => {
        const fixture = create([trip()], ['running']);
        expect(text(fixture)).toContain('いずみ野 07:07');
        expect(text(fixture)).toContain('湘南台 07:14');
        expect(text(fixture)).toContain('走行中');
    });

    it('取り直しで行がずれても、開いた列車は開いたまま', () => {
        const fixture = create([trip()], ['future']);
        const el = fixture.nativeElement as HTMLElement;
        el.querySelector<HTMLButtonElement>('li button')?.click();
        fixture.detectChanges();
        // 前に別の列車が増える
        const other = trip();
        const earlier = {
            ...other,
            trip: {
                ...(other as { trip: object }).trip,
                tripOperationListId: 't0',
            },
        } as FormationDayRow;
        fixture.componentRef.setInput('rows', [earlier, trip()]);
        fixture.componentRef.setInput('states', ['future', 'future']);
        fixture.detectChanges();
        const buttons = el.querySelectorAll<HTMLButtonElement>(
            'li button[aria-expanded]',
        );
        expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
        expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    });

    it('推定の列車に「推定」を出す', () => {
        const fixture = create([trip({ estimated: true })], ['past']);
        expect(text(fixture)).toContain('推定');
    });

    it('行を押すと各駅の時刻が開き、通過は「通過」と出る', () => {
        const fixture = create([trip()], ['future']);
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('[data-testid="trip-times"]')).toBeNull();
        el.querySelector<HTMLButtonElement>('li button')?.click();
        fixture.detectChanges();
        const times = el.querySelector('[data-testid="trip-times"]');
        expect(times?.textContent).toContain('07:07');
        expect(times?.textContent).toContain('通過');
    });

    it('同日引き継ぎの列車は運用番号に「?」を付けて出す', () => {
        const fixture = create([trip({ carriedOver: true })], ['future']);
        expect(text(fixture)).toContain('55?');
    });

    it('unknown の行の文言と投稿への導線', () => {
        const fixture = create([
            {
                kind: 'unknown',
                lastOperationNumber: '55',
                evictedBy: {
                    formationNumber: '8711',
                    sightingTime: '2026-11-11T15:20:00+09:00',
                },
            },
        ]);
        expect(text(fixture).replace(/\s+/g, ' ')).toContain(
            '15:20 に 8711 が 55 で目撃されるまでは 55 でした。その後の運用は分かりません。',
        );
        const emitted: string[] = [];
        fixture.componentInstance.postRequested.subscribe((v) =>
            emitted.push(v),
        );
        (fixture.nativeElement as HTMLElement)
            .querySelector<HTMLButtonElement>('[data-testid="post-link"]')
            ?.click();
        expect(emitted).toEqual(['55']);
    });

    it('入出庫・乗り移り・車両交換の帯を出す', () => {
        const fixture = create([
            { kind: 'depot', label: 'out', stationId: 'a', time: '07:07' },
            { kind: 'transfer', from: '16K', to: '15K', stationId: 'b' },
            {
                kind: 'swap',
                sightingTime: '2026-11-11T15:40:00+09:00',
                toOperationNumber: '59',
            },
            { kind: 'depot', label: 'in', stationId: 'b', time: '21:17' },
        ]);
        const t = text(fixture).replace(/\s+/g, ' ');
        expect(t).toContain('○ いずみ野 07:07 出庫');
        expect(t).toContain('湘南台 で乗り移り');
        expect(t).toContain('15:40 の目撃で');
        expect(t).toContain('△ 湘南台 21:17 入庫');
    });
});
