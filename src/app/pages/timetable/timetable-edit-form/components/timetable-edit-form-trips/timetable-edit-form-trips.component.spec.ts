import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormMode } from '../../special/enums/timetable-edit-form.enum';
import { TimetableEditFormTripsComponent } from './timetable-edit-form-trips.component';

function makeStation(stationId: string): any {
    return { stationId, stationName: stationId, routeStationLists: [] };
}

describe('TimetableEditFormTripsComponent', () => {
    let component: TimetableEditFormTripsComponent;
    let fixture: ComponentFixture<TimetableEditFormTripsComponent>;

    const stations = [makeStation('横浜'), makeStation('二俣川')];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableEditFormTripsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableEditFormTripsComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('serviceId', 'service-1');
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        fixture.componentRef.setInput('mode', ETimetableEditFormMode.ADD);
        fixture.componentRef.setInput(
            'tripDirection',
            ETripDirection.OUTBOUND,
        );
        fixture.componentRef.setInput('stations', stations);
        fixture.componentRef.setInput(
            'visibleStationIds',
            stations.map((s) => s.stationId),
        );
        fixture.componentRef.setInput('operations', []);
        fixture.componentRef.setInput('tripClasses', []);
        fixture.componentRef.setInput('trips', []);

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ADD モードでは1件分の空 trip フォームで初期化される（現行と同じ既定挙動）', () => {
        expect(component.tripsForm.controls.length).toBe(1);
        expect(
            component.tripsForm.controls[0].get('times').value.length,
        ).toBe(stations.length);
    });

    it('B8-1: visibleStations は visibleStationIds に含まれる駅のみを返す（情報削減ではなく表示絞り込み）', () => {
        fixture.componentRef.setInput('visibleStationIds', ['二俣川']);
        fixture.detectChanges();

        expect(component.visibleStations().map((s) => s.stationId)).toEqual([
            '二俣川',
        ]);
        // フォーム自体は駅データを保持したまま（全駅ぶんの times コントロールは維持）
        expect(
            component.tripsForm.controls[0].get('times').value.length,
        ).toBe(stations.length);
    });

    it('B8-3: 一括オフセットは全 trip の全時刻へ適用される', () => {
        component.onClickAdd();
        fixture.detectChanges();

        for (const tripForm of component.tripsForm.controls) {
            const times = tripForm.get('times') as FormArray;
            times.at(0).patchValue({ arrivalTime: '10:00', departureTime: '10:05' });
        }

        component.offsetMinutes.set(15);
        component.onApplyOffset();

        for (const tripForm of component.tripsForm.controls) {
            const times = tripForm.get('times') as FormArray;
            expect(times.at(0).get('arrivalTime').value).toBe('10:15');
            expect(times.at(0).get('departureTime').value).toBe('10:20');
        }
    });

    it('B8-6: restoreTrips が与えられると下書きの trips でフォームを再構築し restored を emit する', () => {
        const restoredSpy = jest.fn();
        component.restored.subscribe(restoredSpy);

        fixture.componentRef.setInput('restoreTrips', [
            {
                tripId: 'trip-1',
                tripNumber: '999',
                times: [],
            },
        ]);
        fixture.detectChanges();

        expect(component.tripsForm.controls.length).toBe(1);
        expect(component.tripsForm.controls[0].get('tripNumber').value).toBe(
            '999',
        );
        expect(restoredSpy).toHaveBeenCalled();
    });
});
