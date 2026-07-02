import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RxState } from '@rx-angular/state';
import { EMPTY } from 'rxjs';

import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableAllLineStateQuery } from '../../states/timetable-all-line.state';
import { TimetableAllLineMainCComponent } from './timetable-all-line-main-c.component';

describe('TimetableAllLineMainCComponent', () => {
    let component: TimetableAllLineMainCComponent;
    let fixture: ComponentFixture<TimetableAllLineMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineMainCComponent],
        })
            .overrideComponent(TimetableAllLineMainCComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        RxState,
                        {
                            provide: TimetableAllLineStateQuery,
                            useValue: {
                                calendarId$: EMPTY,
                                tripDirection$: EMPTY,
                            },
                        },
                        {
                            provide: TimetableSearchCardStateStore,
                            useValue: {
                                setCalendarId: () => {},
                                setTripDirection: () => {},
                            },
                        },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
