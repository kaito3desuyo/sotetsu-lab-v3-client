import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';

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
});
