import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardStore } from '../../stores/dashboard.store';
import { DashboardLatestSightingsComponent } from './dashboard-latest-sightings.component';

describe('DashboardLatestSightingsComponent', () => {
    let fixture: ComponentFixture<DashboardLatestSightingsComponent>;

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
            providers: [provideRouter([])],
        }).compileComponents();

        DashboardStore.setLatestSightings([]);
        fixture = TestBed.createComponent(DashboardLatestSightingsComponent);
    });

    it('取得中で目撃が無いときは「まだありません」を出さず骨組みを表示する', () => {
        DashboardStore.enableLoading();
        fixture.detectChanges();

        // 3 行 × 3 ブロック
        expect(skeletonCount()).toBe(9);
        expect(text()).not.toContain('本日の目撃情報はまだありません');

        DashboardStore.disableLoading();
    });

    it('取得完了後に目撃が無ければ「まだありません」を表示する', () => {
        fixture.detectChanges();

        expect(skeletonCount()).toBe(0);
        expect(text()).toContain('本日の目撃情報はまだありません');
    });
});
