import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { TimetableAllLineStore } from '../../stores/timetable-all-line.store';
import { TimetableAllLineRouteFilterComponent } from './timetable-all-line-route-filter.component';

function makeRouteStation(
    stationId: string,
    routeId: string,
    routeName: string,
): any {
    return {
        stationId,
        stationName: stationId,
        routeStationLists: [
            {
                routeStationListId: `${stationId}-${routeId}`,
                route: { routeId, routeName },
            },
        ],
    };
}

describe('TimetableAllLineRouteFilterComponent', () => {
    let fixture: ComponentFixture<TimetableAllLineRouteFilterComponent>;

    beforeEach(async () => {
        // 選択肢 r1(本線)/r2(厚木線)（group なし・agencyId を付けないので会社名が付かない）、選択 ['r1']。
        TimetableAllLineStore.setStations([
            makeRouteStation('st-r1', 'r1', '本線'),
            makeRouteStation('st-r2', 'r2', '厚木線'),
        ]);
        TimetableAllLineStore.setAgencies([]);
        TimetableAllLineStore.setRouteOrder([]);
        TimetableAllLineStore.setSelectedRouteIds(['r1']);

        await TestBed.configureTestingModule({
            imports: [TimetableAllLineRouteFilterComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        TimetableAllLineStore.setStations([]);
        TimetableAllLineStore.setAgencies([]);
        TimetableAllLineStore.setRouteOrder([]);
        TimetableAllLineStore.setSelectedRouteIds([]);
    });

    it('should create', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('細帯の要約は「路線：…」か「全路線」で、絞り込み中を帯に渡す', () => {
        fixture.detectChanges();
        const band = fixture.debugElement.query(
            By.directive(ControlBandComponent),
        ).componentInstance as ControlBandComponent;
        expect(band.summary()).toBe('路線：本線');
        expect(band.filterActive()).toBe(true);
        expect(band.clearable()).toBe(false);
    });
});
