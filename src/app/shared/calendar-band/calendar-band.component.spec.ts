import { TestBed } from '@angular/core/testing';
import { CalendarBandComponent } from './calendar-band.component';

describe('CalendarBandComponent', () => {
    const render = (calendar: {
        calendarName: string;
        startDate: string;
        saturday: boolean;
        sunday: boolean;
    }) => {
        const fixture = TestBed.createComponent(CalendarBandComponent);
        fixture.componentRef.setInput('calendar', calendar);
        fixture.componentRef.setInput('suffix', '上り時刻表');
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('平日ダイヤは青の帯に改正日とダイヤ名を 2 行で出す', () => {
        const el = render({
            calendarName: '平日ダイヤ',
            startDate: '2026-03-14',
            saturday: false,
            sunday: false,
        });
        expect(el.classList).toContain('weekday');
        expect(el.classList).not.toContain('holiday');
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        expect(text).toBe('2026/3/14改正 平日ダイヤ 上り時刻表');
        expect(el.querySelector('br')).not.toBeNull();
    });

    it('土休日ダイヤは赤の帯にする', () => {
        const el = render({
            calendarName: '土休日ダイヤ',
            startDate: '2026-03-14',
            saturday: true,
            sunday: true,
        });
        expect(el.classList).toContain('holiday');
        expect(el.classList).not.toContain('weekday');
    });
});
