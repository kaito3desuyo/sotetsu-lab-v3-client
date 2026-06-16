import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';

import { OperationTableStateQuery } from '../../states/operation-table.state';
import { OperationTableTableContainerComponent } from './operation-table-table-container.component';

describe('OperationTableTableContainerComponent', () => {
    let component: OperationTableTableContainerComponent;
    let fixture: ComponentFixture<OperationTableTableContainerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableTableContainerComponent],
            providers: [
                {
                    provide: OperationTableStateQuery,
                    useValue: {
                        calendarId$: EMPTY,
                        operationTrips$: EMPTY,
                        stations$: EMPTY,
                        tripClasses$: EMPTY,
                    },
                },
            ],
        })
            .overrideComponent(OperationTableTableContainerComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationTableTableContainerComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
