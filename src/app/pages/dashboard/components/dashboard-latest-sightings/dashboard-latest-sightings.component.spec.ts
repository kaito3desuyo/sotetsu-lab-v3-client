import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { DashboardStore } from '../../stores/dashboard.store';
import { DashboardLatestSightingsComponent } from './dashboard-latest-sightings.component';

describe('DashboardLatestSightingsComponent', () => {
    let fixture: ComponentFixture<DashboardLatestSightingsComponent>;
    let store: InstanceType<typeof DashboardStore>;

    function skeletonCount(): number {
        return fixture.nativeElement.querySelectorAll('.tw-animate-pulse')
            .length;
    }

    function text(): string {
        return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardLatestSightingsComponent],
            providers: [
                provideRouter([]),
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: () => Promise.resolve(null),
                        setItem: () => Promise.resolve(),
                        removeItem: () => Promise.resolve(),
                    },
                },
            ],
        }).compileComponents();

        store = TestBed.inject(DashboardStore);
        store.setLatestSightings([]);
        fixture = TestBed.createComponent(DashboardLatestSightingsComponent);
    });

    it('取得中で目撃が無いときは「まだありません」を出さず骨組みを表示する', () => {
        store.enableLoading();
        fixture.detectChanges();

        // 3 行 × 3 ブロック
        expect(skeletonCount()).toBe(9);
        expect(text()).not.toContain('本日の目撃情報はまだありません');

        store.disableLoading();
    });

    it('編成番号は編成別時刻表へのリンク（今日の目撃なので日付は付けない）', () => {
        patchState(
            unprotected(TestBed.inject(TodaysFormationListState)),
            setAllEntities(
                [{ formationId: 'f-1', formationNumber: '10701' }] as never,
                { selectId: (f: { formationId: string }) => f.formationId },
            ),
        );
        store.setLatestSightings([
            {
                operationSightingId: 's1',
                formationId: 'f-1',
                sightingTime: '2026-11-13T01:00:00.000Z',
            },
        ]);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                'a[href*="/timetable/formation"]',
            ),
        ).toHaveAttribute(
            'href',
            '/timetable/formation;formation_number=10701',
        );
    });

    it('取得完了後に目撃が無ければ「まだありません」を表示する', () => {
        fixture.detectChanges();

        expect(skeletonCount()).toBe(0);
        expect(text()).toContain('本日の目撃情報はまだありません');
    });
});
