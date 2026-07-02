import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RxState } from '@rx-angular/state';
import { EMPTY } from 'rxjs';

import { OperationSearchCardService } from '../../services/operation-search-card.service';
import {
    OperationSearchCardStateQuery,
    OperationSearchCardStateStore,
} from '../../states/operation-search-card.state';
import { OperationSearchCardCComponent } from './operation-search-card-c.component';

describe('OperationSearchCardCComponent', () => {
    let component: OperationSearchCardCComponent;
    let fixture: ComponentFixture<OperationSearchCardCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationSearchCardCComponent],
        })
            .overrideComponent(OperationSearchCardCComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        RxState,
                        {
                            provide: OperationSearchCardService,
                            useValue: { fetchOperations: () => EMPTY },
                        },
                        {
                            provide: OperationSearchCardStateStore,
                            useValue: {
                                setCalendarId: () => {},
                                setOperationId: () => {},
                            },
                        },
                        {
                            provide: OperationSearchCardStateQuery,
                            useValue: {
                                calendarId$: EMPTY,
                                operationId$: EMPTY,
                                calendars$: EMPTY,
                                operations$: EMPTY,
                                get calendarId() { return null; },
                                get operationId() { return null; },
                            },
                        },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationSearchCardCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
