import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TimetablePostCardComponent } from './timetable-post-card.component';

describe('TimetablePostCardComponent', () => {
    let component: TimetablePostCardComponent;
    let fixture: ComponentFixture<TimetablePostCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetablePostCardComponent],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
                {
                    provide: CalendarListStateQuery,
                    useValue: { calendars$: of([]) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetablePostCardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('ダイヤを選ぶまで「列車情報入力へ移る」は押せない', () => {
        expect(component.form.invalid).toBe(true);
    });

    it('列車の追加へ: calendar_id / trip_direction を matrix param で渡す（ルートの形に合わせる）', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        component.form.setValue({
            calendarId: 'cal-1',
            tripDirection: ETripDirection.OUTBOUND,
        });
        component.submit();

        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'add',
            { calendar_id: 'cal-1', trip_direction: ETripDirection.OUTBOUND },
        ]);
    });
});
