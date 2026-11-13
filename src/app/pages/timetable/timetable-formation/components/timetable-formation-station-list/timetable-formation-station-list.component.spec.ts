import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormationStationSummary } from '../../utils/formation-station-filter.util';
import { TimetableFormationStationListComponent } from './timetable-formation-station-list.component';

const visit = (passing: boolean, done: boolean) =>
    ({
        trip: {
            tripOperationListId: 't',
            endStationId: 'e',
            trip: {
                tripId: 'x',
                tripNumber: '1454',
                tripDirection: 0,
                tripClass: { tripClassId: 'c', tripClassName: '通勤' },
            },
        },
        time: {
            timeId: 'm',
            arrivalDays: 1,
            arrivalTime: passing ? undefined : '07:34:00',
            departureDays: 1,
            departureTime: passing ? undefined : '07:37:00',
        },
        passing,
        done,
    }) as never;

function render(summary: FormationStationSummary, dateKind = 'today') {
    TestBed.configureTestingModule({
        imports: [TimetableFormationStationListComponent],
        providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(
        TimetableFormationStationListComponent,
    );
    fixture.componentRef.setInput('summary', summary);
    fixture.componentRef.setInput('stationName', '二俣川');
    fixture.componentRef.setInput('stationNames', { e: '横浜' });
    fixture.componentRef.setInput('dateKind', dateKind);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent?.replace(
        /\s+/g,
        ' ',
    );
}

describe('TimetableFormationStationListComponent', () => {
    const summary: FormationStationSummary = {
        visits: [visit(false, true), visit(true, false)],
        total: 16,
        stops: 14,
        passes: 2,
        done: 13,
        remaining: 3,
    };

    it('通る回数を「16 回（停車 14・通過 2）」の形で出す', () => {
        const text = render(summary);
        expect(text).toContain('16 回（停車 14・通過 2）');
        expect(text).toContain('済み 13・残り 3');
    });

    it('着時刻と発時刻と行先を出し、通過は時刻を出さず「通過」と出す', () => {
        const text = render(summary);
        expect(text).toContain('07:34 着 07:37 発');
        expect(text).toContain('→ 横浜');
        expect(text).toContain('通過');
    });

    it('過去の日は済み・残りを出さない', () => {
        expect(render(summary, 'past')).not.toContain('残り');
    });
});
