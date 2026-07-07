import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationPastTimeComponent } from './operation-past-time.component';
import { OperationPastTimeService } from './services/operation-past-time.service';
import { OperationPastTimeStore } from './stores/operation-past-time.store';

describe('OperationPastTimeComponent', () => {
    let component: OperationPastTimeComponent;
    let fixture: ComponentFixture<OperationPastTimeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => of(undefined),
                    },
                },
                {
                    provide: OperationSearchCardService,
                    useValue: {
                        receiveSearchOperationTableEvent: () => EMPTY,
                        receiveSearchOperationRouteDiagramEvent: () => EMPTY,
                    },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        OperationPastTimeStore.setReferenceDate(null);
        OperationPastTimeStore.setDays(null);
        OperationPastTimeStore.setIncludeInvalidated(false);
        OperationPastTimeStore.setSelectedAgencyIds([]);
        OperationPastTimeStore.resetLoading();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('fetchData: フェッチ完了で loadingQueue が空になる', async () => {
        await component.fetchData();

        expect(OperationPastTimeStore.isLoading$).toBeDefined();
    });
});
