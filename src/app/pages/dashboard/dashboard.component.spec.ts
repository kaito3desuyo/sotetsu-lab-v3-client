import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { EMPTY } from 'rxjs';

import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { TimetablePostCardService } from 'src/app/shared/timetable-post-card/services/timetable-post-card.service';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(DashboardComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        RxState,
                        {
                            provide: OperationSearchCardService,
                            useValue: {
                                receiveSearchOperationTableEvent: () => EMPTY,
                                receiveSearchOperationRouteDiagramEvent: () =>
                                    EMPTY,
                            },
                        },
                        {
                            provide: TimetableSearchCardService,
                            useValue: {
                                receiveSearchTimetableEvent: () => EMPTY,
                            },
                        },
                        {
                            provide: TimetablePostCardService,
                            useValue: {
                                receiveMoveTimetableAddEvent: () => EMPTY,
                            },
                        },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
