import { ComponentFixture, TestBed } from '@angular/core/testing';
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
            makeStation('いずみ野', ['いずみ野線']),
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

    it('経由しない路線（いずみ野線）は disabled として渡される', () => {
        const options = component.routeOptions();

        expect(
            options.find((o) => o.value === 'いずみ野線')?.disabled,
        ).toBe(true);
        expect(options.find((o) => o.value === '本線')?.disabled).toBe(
            false,
        );
    });

    it('onChange で選択路線をストアへ書き込む', () => {
        component.onChange(['本線', 'いずみ野線']);
        fixture.detectChanges();

        expect(component.selectedRouteIds()).toEqual(['本線', 'いずみ野線']);
    });
});
