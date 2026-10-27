import { NO_ERRORS_SCHEMA } from '@angular/core';
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
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineRouteFilterComponent],
        }).compileComponents();

        // 選択肢 r1(本線)/r2(厚木線)（group なし・agencyId を付けないので会社名が付かない）、選択 ['r1']。
        const store = TestBed.inject(TimetableAllLineStore);
        store.setStations([
            makeRouteStation('st-r1', 'r1', '本線'),
            makeRouteStation('st-r2', 'r2', '厚木線'),
        ]);
        store.setAgencies([]);
        store.setRouteOrder([]);
        store.setSelectedRouteIds(['r1']);

        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.detectChanges();
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

    it('帯は列車ダイヤグラムと同じ manual（余白は他ページと同じ gutter なので flush にしない）で、畳んだ状態をページと受け渡す', () => {
        const band = fixture.debugElement.query(
            By.directive(ControlBandComponent),
        ).componentInstance as ControlBandComponent;
        expect(band.collapse()).toBe('manual');
        expect(band.flush()).toBe(false);
        expect(band.collapsed()).toBe(false);

        fixture.componentRef.setInput('collapsed', true);
        fixture.detectChanges();
        expect(band.collapsed()).toBe(true);

        const emitted: boolean[] = [];
        fixture.componentInstance.collapsed.subscribe((value) =>
            emitted.push(value),
        );
        band.collapsed.set(false);
        expect(emitted).toEqual([false]);
    });
});

describe('TimetableAllLineRouteFilterComponent の読み込み中', () => {
    let fixture: ComponentFixture<TimetableAllLineRouteFilterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineRouteFilterComponent],
        })
            .overrideComponent(TimetableAllLineRouteFilterComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    it('ダイヤがあって取る前は、操作帯にチップの形の骨組みを出し、要約は空にする', () => {
        TestBed.inject(TimetableAllLineStore).setCalendarId('cal-1');
        TestBed.inject(TimetableAllLineStore).setHasFetchedTripBlocks(false);
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelectorAll('app-control-band').length).toBe(1);
        expect(el.querySelector('app-skeleton-chips')).not.toBeNull();
        expect(el.querySelector('app-filter-chips')).toBeNull();
        expect(fixture.componentInstance.bandSummaryOrEmpty()).toBe('');
    });

    it('取り終えたら骨組みを本物のチップに替える（帯は作り直さない）', () => {
        TestBed.inject(TimetableAllLineStore).setStations([
            makeRouteStation('st-r1', 'r1', '本線'),
        ]);
        TestBed.inject(TimetableAllLineStore).setCalendarId('cal-1');
        TestBed.inject(TimetableAllLineStore).setHasFetchedTripBlocks(false);
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.detectChanges();
        const band = (fixture.nativeElement as HTMLElement).querySelector(
            'app-control-band',
        );

        TestBed.inject(TimetableAllLineStore).setHasFetchedTripBlocks(true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-skeleton-chips')).toBeNull();
        expect(el.querySelector('app-filter-chips')).not.toBeNull();
        expect(el.querySelector('app-control-band')).toBe(band);
    });

    it('ダイヤが無く選択肢も無ければ、操作帯ごと出さない（今のまま）', () => {
        TestBed.inject(TimetableAllLineStore).setCalendarId(
            null as unknown as string,
        );
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                'app-control-band',
            ),
        ).toBeNull();
    });

    it('alwaysVisible なら、選択肢が無くても帯を出す', () => {
        TestBed.inject(TimetableAllLineStore).setCalendarId(
            null as unknown as string,
        );
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.componentRef.setInput('alwaysVisible', true);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                'app-control-band',
            ),
        ).not.toBeNull();
    });

    it('summaryLead は路線の要約の前に付き、取る前は頭だけになる', () => {
        TestBed.inject(TimetableAllLineStore).setCalendarId('cal-1');
        TestBed.inject(TimetableAllLineStore).setHasFetchedTripBlocks(false);
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.componentRef.setInput(
            'summaryLead',
            '2026/3/14改正 平日ダイヤ 下り',
        );
        fixture.detectChanges();
        expect(fixture.componentInstance.bandSummaryOrEmpty()).toBe(
            '2026/3/14改正 平日ダイヤ 下り',
        );

        TestBed.inject(TimetableAllLineStore).setHasFetchedTripBlocks(true);
        fixture.detectChanges();
        expect(fixture.componentInstance.bandSummaryOrEmpty()).toBe(
            '2026/3/14改正 平日ダイヤ 下り 全路線',
        );
    });
});
