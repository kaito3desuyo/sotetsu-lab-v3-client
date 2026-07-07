import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { NotificationService } from 'src/app/core/services/notification.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationTableComponent } from './operation-table.component';
import { OperationTableService } from './services/operation-table.service';
import { OperationTableStore } from './stores/operation-table.store';

describe('OperationTableComponent', () => {
    let component: OperationTableComponent;
    let fixture: ComponentFixture<OperationTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationTableService,
                    useValue: {
                        fetchCalendar: () => of(undefined),
                        fetchOperationTrips: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchOperationGroups: () => of(undefined),
                    },
                },
                {
                    provide: OperationSearchCardService,
                    useValue: {
                        receiveSearchOperationTableEvent: () => EMPTY,
                        receiveSearchOperationRouteDiagramEvent: () => EMPTY,
                    },
                },
                {
                    provide: OperationSearchCardStateStore,
                    useValue: { setCalendarId: () => {} },
                },
                {
                    provide: NotificationService,
                    useValue: { open: () => {} },
                },
            ],
        })
            .overrideComponent(OperationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationTableComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        OperationTableStore.setCalendarId(null);
        OperationTableStore.setSelectedGroupNames([]);
        OperationTableStore.resetLoading();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('isCardVisible: 群未選択時は常に true（全カード表示）', () => {
        expect(component.isCardVisible('11')).toBe(true);
    });

    it('onJump: 対象要素が無くても例外を投げない', () => {
        expect(() => component.onJump('999')).not.toThrow();
    });
});
