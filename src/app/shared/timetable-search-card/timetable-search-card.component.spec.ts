import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TimetableSearchCardComponent } from './timetable-search-card.component';

describe('TimetableSearchCardComponent', () => {
    let component: TimetableSearchCardComponent;
    let fixture: ComponentFixture<TimetableSearchCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableSearchCardComponent],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
                {
                    provide: CalendarListState,
                    useValue: { calendars: signal([]) },
                },
                {
                    provide: RouteStationListState,
                    useValue: { routeStations: signal([]) },
                },
                {
                    provide: AgencyListState,
                    useValue: { agencies: signal([]) },
                },
            ],
        }).compileComponents();
        setTodaysCalendars(['today']);

        fixture = TestBed.createComponent(TimetableSearchCardComponent);
        component = fixture.componentInstance;
    });

    it('ダイヤを渡さなければ今日のダイヤ・上り・駅指定なしで始まる', () => {
        fixture.detectChanges();

        expect(component.form.getRawValue()).toEqual({
            calendarId: 'today',
            tripDirection: ETripDirection.INBOUND,
            searchByStation: false,
            stationId: '',
        });
        expect(component.form.get('stationId').disabled).toBe(true);
    });

    it('ページから渡したダイヤ・方向・駅をフォームに入れ、駅があれば駅指定にする', () => {
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.componentRef.setInput('tripDirection', ETripDirection.OUTBOUND);
        fixture.componentRef.setInput('stationId', 'st-1');
        fixture.detectChanges();

        expect(component.form.getRawValue()).toEqual({
            calendarId: 'cal-1',
            tripDirection: ETripDirection.OUTBOUND,
            searchByStation: true,
            stationId: 'st-1',
        });
        expect(component.form.get('stationId').enabled).toBe(true);
    });

    it('ページの値が変われば（同じページ内の遷移）フォームを入れ直す', () => {
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.detectChanges();
        fixture.componentRef.setInput('calendarId', 'cal-2');
        fixture.detectChanges();

        expect(component.form.get('calendarId').value).toBe('cal-2');
    });

    it('駅を指定しなければ全線時刻表へ移る', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.componentRef.setInput('tripDirection', ETripDirection.OUTBOUND);
        fixture.detectChanges();

        component.submit();

        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'all-line',
            { calendar_id: 'cal-1', trip_direction: ETripDirection.OUTBOUND },
        ]);
    });

    it('駅を指定すれば駅別時刻表へ移る', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.componentRef.setInput('stationId', 'st-1');
        fixture.detectChanges();

        component.submit();

        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'station',
            {
                calendar_id: 'cal-1',
                station_id: 'st-1',
                trip_direction: ETripDirection.INBOUND,
            },
        ]);
    });
});
