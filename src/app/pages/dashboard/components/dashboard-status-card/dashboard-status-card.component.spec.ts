import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStore } from '../../stores/dashboard.store';
import { DashboardStatusCardComponent } from './dashboard-status-card.component';

describe('DashboardStatusCardComponent', () => {
    let fixture: ComponentFixture<DashboardStatusCardComponent>;

    /** スタット 2 枚（計画走行本数 / 本日の目撃投稿数）の表示テキストを返す */
    function statTexts(): string[] {
        const stats = fixture.nativeElement.querySelectorAll(
            '.tw-text-3xl',
        ) as NodeListOf<HTMLElement>;
        return Array.from(stats).map((el) => el.textContent?.trim() ?? '');
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardStatusCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DashboardStatusCardComponent);
    });

    afterEach(() => {
        DashboardStore.setRunningTripCount(0);
        DashboardStore.setSightingCountToday(0);
    });

    it('ロード中はスタットに数値を出さず骨組みを表示する（偽の 0 と区別する）', () => {
        DashboardStore.setRunningTripCount(0);
        DashboardStore.setSightingCountToday(0);
        DashboardStore.enableLoading();
        fixture.detectChanges();

        const skeletons = fixture.nativeElement.querySelectorAll(
            '.tw-animate-pulse[aria-label="読み込み中"]',
        ) as NodeListOf<HTMLElement>;
        expect(statTexts()).toEqual([]);
        // カレンダー名（未取得）1 + スタット 2
        expect(skeletons.length).toBe(3);

        DashboardStore.disableLoading();
    });

    it('祝日・年末年始・特別ダイヤなら日付の右に何の日かを出し、該当しなければ出さない', () => {
        DashboardStore.setTodaysDayName('秋分の日');
        fixture.detectChanges();
        expect(fixture.nativeElement).toHaveTextContent('秋分の日');

        DashboardStore.setTodaysDayName(null);
        fixture.detectChanges();
        expect(fixture.nativeElement).not.toHaveTextContent('秋分の日');
    });

    it('ロード完了後は実数値を表示する', () => {
        DashboardStore.setRunningTripCount(42);
        DashboardStore.setSightingCountToday(7);
        fixture.detectChanges();

        expect(statTexts()).toEqual(['42', '7']);
    });
});
