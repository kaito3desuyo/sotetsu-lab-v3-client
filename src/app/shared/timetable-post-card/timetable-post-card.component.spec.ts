import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TimetablePostCardComponent } from './timetable-post-card.component';

describe('TimetablePostCardComponent', () => {
    let component: TimetablePostCardComponent;
    let fixture: ComponentFixture<TimetablePostCardComponent>;
    let loggedIn$: BehaviorSubject<boolean>;
    let canEdit$: BehaviorSubject<boolean>;

    beforeEach(async () => {
        loggedIn$ = new BehaviorSubject(true);
        canEdit$ = new BehaviorSubject(true);
        await TestBed.configureTestingModule({
            imports: [TimetablePostCardComponent],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
                {
                    provide: UserStateQuery,
                    useValue: {
                        isLoggedIn$: loggedIn$,
                        canEditTimetable$: canEdit$,
                    },
                },
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

    describe('入力できるのは編集者だけ', () => {
        const el = (): HTMLElement => fixture.nativeElement;

        it('編集者にはフォームを出す', () => {
            expect(el().querySelector('form')).not.toBeNull();
            expect(el()).not.toHaveTextContent('時刻表の入力は編集者のみです');
        });

        it('ゲストにはフォームの代わりに案内とログイン・新規登録のボタンを出す', () => {
            loggedIn$.next(false);
            canEdit$.next(false);
            fixture.detectChanges();

            expect(el().querySelector('form')).toBeNull();
            expect(el()).toHaveTextContent('時刻表の入力は編集者のみです');
            const links = Array.from(el().querySelectorAll('a')).map((a) =>
                decodeURIComponent(a.getAttribute('href') ?? ''),
            );
            expect(links).toContain('/login?return_to=/');
            expect(links).toContain('/register?return_to=/');
        });

        it('役割の足りない登録者には案内だけを出す（ボタンは出さない）', () => {
            loggedIn$.next(true);
            canEdit$.next(false);
            fixture.detectChanges();

            expect(el().querySelector('form')).toBeNull();
            expect(el()).toHaveTextContent('時刻表の入力は編集者のみです');
            expect(el().querySelectorAll('a')).toHaveLength(0);
        });
    });
});
