import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';

import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationTableStateQuery } from '../../states/operation-table.state';
import { OperationTableMainCComponent } from './operation-table-main-c.component';

describe('OperationTableMainCComponent', () => {
    let component: OperationTableMainCComponent;
    let fixture: ComponentFixture<OperationTableMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableMainCComponent],
            providers: [
                {
                    provide: OperationTableStateQuery,
                    useValue: { calendarId$: EMPTY },
                },
                {
                    provide: OperationSearchCardStateStore,
                    useValue: { setCalendarId: () => {} },
                },
            ],
        })
            .overrideComponent(OperationTableMainCComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationTableMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
