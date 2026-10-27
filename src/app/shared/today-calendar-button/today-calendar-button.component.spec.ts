import { ComponentFixture, TestBed } from '@angular/core/testing';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { TodayCalendarButtonComponent } from './today-calendar-button.component';

describe('TodayCalendarButtonComponent', () => {
    let fixture: ComponentFixture<TodayCalendarButtonComponent>;
    const button = () =>
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TodayCalendarButtonComponent],
        }).compileComponents();
        setTodaysCalendars(['special', 'base']);
        fixture = TestBed.createComponent(TodayCalendarButtonComponent);
    });

    it.each(['special', 'base'])(
        '今日のダイヤ（%s）を見ている間は押せない',
        (calendarId) => {
            fixture.componentRef.setInput('calendarId', calendarId);
            fixture.detectChanges();
            expect(button().disabled).toBe(true);
        },
    );

    it('別のダイヤを見ているときは押せて、今日の先頭のダイヤを流す', () => {
        fixture.componentRef.setInput('calendarId', 'old');
        fixture.detectChanges();
        const emitted: string[] = [];
        fixture.componentInstance.selectToday.subscribe((id) =>
            emitted.push(id),
        );

        expect(button().disabled).toBe(false);
        button().click();
        expect(emitted).toEqual(['special']);
    });

    it('今日のダイヤがまだ無い間は、別のダイヤを見ていても押せない', () => {
        setTodaysCalendars([]);
        fixture.componentRef.setInput('calendarId', 'old');
        fixture.detectChanges();
        expect(button().disabled).toBe(true);
    });

    it('calendarId が null（ページがまだダイヤを持たない）のときは押せて、今日の先頭のダイヤを流す', () => {
        fixture.componentRef.setInput('calendarId', null);
        fixture.detectChanges();
        const emitted: string[] = [];
        fixture.componentInstance.selectToday.subscribe((id) =>
            emitted.push(id),
        );

        expect(button().disabled).toBe(false);
        button().click();
        expect(emitted).toEqual(['special']);
    });
});
