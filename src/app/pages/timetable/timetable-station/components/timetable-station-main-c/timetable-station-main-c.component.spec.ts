import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RxState } from '@rx-angular/state';
import { EMPTY } from 'rxjs';

import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableStationStateQuery } from '../../states/timetable-station.state';
import { TimetableStationMainCComponent } from './timetable-station-main-c.component';

describe('TimetableStationMainCComponent', () => {
    let component: TimetableStationMainCComponent;
    let fixture: ComponentFixture<TimetableStationMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableStationMainCComponent],
        })
            .overrideComponent(TimetableStationMainCComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        RxState,
                        {
                            provide: TimetableStationStateQuery,
                            useValue: {
                                calendarId$: EMPTY,
                                tripDirection$: EMPTY,
                                stationId$: EMPTY,
                            },
                        },
                        {
                            provide: TimetableSearchCardStateStore,
                            useValue: {
                                setCalendarId: () => {},
                                setTripDirection: () => {},
                                enableSearchByStation: () => {},
                                setStationId: () => {},
                            },
                        },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableStationMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
