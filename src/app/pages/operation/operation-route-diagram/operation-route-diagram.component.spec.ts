import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';

import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from './stores/operation-route-diagram.store';
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
                    provide: OperationRouteDiagramService,
                    useValue: {
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

    it('列車の帯を押すと、その列車の全線時刻表へ移る', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        component.onClickNavigateTimetable({
            tripBlockId: 'block-1',
            tripDirection: ETripDirection.OUTBOUND,
        });

        expect(navigate).toHaveBeenCalledWith([
            '/timetable',
            'all-line',
            expect.objectContaining({
                trip_block_id: 'block-1',
                trip_direction: ETripDirection.OUTBOUND,
            }),
        ]);
    });

    it('途中の切り替えが 2 件あっても、列車 id で区別する', () => {
        OperationRouteDiagramStore.setOperationTrips({
            operation: { operationId: 'op-1', calendarId: 'cal-1' },
            trips: [
                { trip: { tripId: 't1', tripNumber: '1818K' } },
                { trip: { tripId: 't2', tripNumber: '1818K' } },
            ],
        } as never);
        const end = {
            tripOperationListId: 'x',
            tripId: 'x',
            operationId: 'x',
            operationNumber: '18K',
            stationId: 's',
            rule: 1,
        };
        OperationRouteDiagramStore.setItineraryLinks([
            {
                tripOperationListId: 'a',
                tripId: 't1',
                operationId: 'op-1',
                previous: null,
                next: end,
            },
            {
                tripOperationListId: 'b',
                tripId: 't2',
                operationId: 'op-1',
                previous: null,
                next: end,
            },
        ] as never);

        const labels = component.linkLabels();

        expect(Object.keys(labels.midTrip)).toEqual(['t1', 't2']);
        expect(labels.midTrip['t1']).toEqual(labels.midTrip['t2']);
    });
});
