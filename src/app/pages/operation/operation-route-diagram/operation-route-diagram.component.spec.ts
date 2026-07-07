import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';

import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramComponent } from './operation-route-diagram.component';

describe('OperationRouteDiagramComponent', () => {
    let component: OperationRouteDiagramComponent;
    let fixture: ComponentFixture<OperationRouteDiagramComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationSearchCardService,
                    useValue: {
                        receiveSearchOperationTableEvent: () => EMPTY,
                        receiveSearchOperationRouteDiagramEvent: () => EMPTY,
                    },
                },
                {
                    provide: OperationSearchCardStateStore,
                    useValue: {
                        setCalendarId: () => {},
                        setOperationId: () => {},
                    },
                },
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        receiveNavigateTimetableEvent: () => EMPTY,
                        fetchOperationTrips: () => EMPTY,
                        fetchStations: () => EMPTY,
                    },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
