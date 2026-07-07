import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { OperationTableCardComponent } from './operation-table-card.component';

describe('OperationTableCardComponent', () => {
    let component: OperationTableCardComponent;
    let fixture: ComponentFixture<OperationTableCardComponent>;

    const stations = [
        { stationId: 'st-1', stationName: '海老名' },
        { stationId: 'st-2', stationName: '横浜' },
    ] as StationDetailsDto[];

    const tripClasses = [
        {
            tripClassId: 'tc-1',
            tripClassName: '快速',
            tripClassColor: '#1e88e5',
        },
        {
            tripClassId: 'tc-2',
            tripClassName: '回送',
            tripClassColor: '#9e9e9e',
        },
    ] as TripClassDetailsDto[];

    const operationTrip = {
        operation: { operationId: 'op-1', operationNumber: '11' },
        trips: [
            {
                tripOperationListId: 'tol-1',
                startTime: { stationId: 'st-1', departureTime: '05:15:00' },
                endTime: { stationId: 'st-2', arrivalTime: '05:52:00' },
                trip: {
                    tripId: 'trip-1',
                    tripNumber: '2002',
                    tripClassId: 'tc-1',
                    tripDirection: 0,
                    tripBlockId: 'block-1',
                    depotIn: false,
                    depotOut: false,
                },
            },
            {
                tripOperationListId: 'tol-2',
                startTime: { stationId: 'st-2', departureTime: '22:09:00' },
                endTime: { stationId: 'st-1', arrivalTime: '22:13:00' },
                trip: {
                    tripId: 'trip-2',
                    tripNumber: '9394',
                    tripClassId: 'tc-2',
                    tripDirection: 1,
                    tripBlockId: 'block-2',
                    depotIn: true,
                    depotOut: false,
                },
            },
        ],
    } as unknown as OperationTripsDto;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableCardComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationTableCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('operationTrip', operationTrip);
        fixture.componentRef.setInput('stations', stations);
        fixture.componentRef.setInput('tripClasses', tripClasses);
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('本数サマリは trips.length と一致する', () => {
        expect(component.tripCount()).toBe(2);
    });

    it('発→着の順に正規化した行を生成する（駅・時刻・種別+列番）', () => {
        const rows = component.rows();

        expect(rows[0]).toMatchObject({
            startStationName: '海老名',
            startTime: '05:15:00',
            endStationName: '横浜',
            endTime: '05:52:00',
            tripClassName: '快速',
            tripNumber: '2002',
            isDeadhead: false,
            depotOut: false,
            depotIn: false,
        });
    });

    it('回送は isDeadhead=true として判定される', () => {
        const rows = component.rows();
        expect(rows[1].isDeadhead).toBe(true);
    });

    it('入庫フラグを維持する（情報要素の維持）', () => {
        const rows = component.rows();
        expect(rows[1].depotIn).toBe(true);
    });
});
