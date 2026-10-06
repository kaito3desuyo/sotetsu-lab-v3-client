import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationRouteDiagramStore } from '../../stores/operation-route-diagram.store';
import { OperationRouteDiagramRouteFilterComponent } from './operation-route-diagram-route-filter.component';

function makeStation(stationId: string, routeIds: string[]): any {
    return {
        stationId,
        stationName: stationId,
        routeStationLists: routeIds.map((routeId) => ({
            routeStationListId: `${stationId}-${routeId}`,
            route: { routeId, routeName: routeId },
        })),
    };
}

describe('OperationRouteDiagramRouteFilterComponent', () => {
    let component: OperationRouteDiagramRouteFilterComponent;
    let fixture: ComponentFixture<OperationRouteDiagramRouteFilterComponent>;

    beforeEach(async () => {
        OperationRouteDiagramStore.setStations([
            makeStation('かしわ台', ['本線']),
            makeStation('大和', ['本線']),
            // 二俣川は本線といずみ野線の分岐駅。経由路線（本線）と同一駅で繋がる
            // 「関連路線」としていずみ野線チップを残す根拠になる（P8-3）。
            makeStation('二俣川', ['本線', 'いずみ野線']),
            makeStation('いずみ野', ['いずみ野線']),
            // 厚木線はどの経由駅とも接続しない無関係路線。チップ自体が
            // 表示されないことを P8-3 のテストで確認する。
            makeStation('厚木', ['厚木線']),
        ]);
        OperationRouteDiagramStore.setOperationTrips({
            operation: {} as any,
            trips: [
                {
                    startTime: { stationId: 'かしわ台' },
                    endTime: { stationId: '大和' },
                } as any,
            ],
        });
        OperationRouteDiagramStore.setSelectedRouteIds(['本線']);

        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramRouteFilterComponent],
            providers: [
                {
                    // 系統順はいずみ野線が本線より前（並びが入れ替わることを確かめるため）
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            { routeId: 'いずみ野線', agencyId: 'so' },
                            { routeId: '本線', agencyId: 'so' },
                        ]),
                    },
                },
                {
                    provide: AgencyListStateQuery,
                    useValue: {
                        agencies$: of([{ agencyId: 'so', agencyName: '相鉄' }]),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(
            OperationRouteDiagramRouteFilterComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        OperationRouteDiagramStore.setStations([]);
        OperationRouteDiagramStore.setOperationTrips(null);
        OperationRouteDiagramStore.setSelectedRouteIds([]);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('経由しない関連路線（いずみ野線）は disabled として渡される', () => {
        const options = component.routeOptions();

        expect(options.find((o) => o.value === 'いずみ野線')?.disabled).toBe(
            true,
        );
        expect(options.find((o) => o.value === '本線')?.disabled).toBe(false);
    });

    it('P8-3: 経由路線と接続しない無関係路線（厚木線）のチップは表示されない', () => {
        const options = component.routeOptions();

        expect(options.find((o) => o.value === '厚木線')).toBeUndefined();
    });

    it('チップは系統順に並べ、会社名で見出しを付ける（他ページと同じ並び）', () => {
        const options = component.routeOptions();

        expect(options.map((o) => [o.value, o.group])).toEqual([
            ['いずみ野線', '相鉄'],
            ['本線', '相鉄'],
        ]);
    });

    it('onChange で選択路線をストアへ書き込む', () => {
        component.onChange(['本線', 'いずみ野線']);
        fixture.detectChanges();

        expect(component.selectedRouteIds()).toEqual(['本線', 'いずみ野線']);
    });
});

describe('OperationRouteDiagramRouteFilterComponent の細帯要約（Task 8）', () => {
    let fixture: ComponentFixture<OperationRouteDiagramRouteFilterComponent>;

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

    beforeEach(async () => {
        // 選択肢 r1(本線)/r2(厚木線)（group なし）、選択 ['r1']。
        // 会社・系統の対応表（Route/AgencyStateQuery）には出てこない路線にして
        // group が付かないようにする。
        OperationRouteDiagramStore.setStations([
            makeRouteStation('st-r1', 'r1', '本線'),
            makeRouteStation('st-r2', 'r2', '厚木線'),
        ]);
        OperationRouteDiagramStore.setOperationTrips({
            operation: {} as any,
            trips: [
                {
                    startTime: { stationId: 'st-r1' },
                    endTime: { stationId: 'st-r2' },
                } as any,
            ],
        });
        OperationRouteDiagramStore.setSelectedRouteIds(['r1']);

        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramRouteFilterComponent],
            providers: [
                {
                    provide: RouteStationListStateQuery,
                    useValue: { routeStations$: of([]) },
                },
                {
                    provide: AgencyListStateQuery,
                    useValue: { agencies$: of([]) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(
            OperationRouteDiagramRouteFilterComponent,
        );
        fixture.detectChanges();
    });

    afterEach(() => {
        OperationRouteDiagramStore.setStations([]);
        OperationRouteDiagramStore.setOperationTrips(null);
        OperationRouteDiagramStore.setSelectedRouteIds([]);
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
