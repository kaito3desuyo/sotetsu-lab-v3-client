import { TestBed } from '@angular/core/testing';
import { OperationRealTimeSkeletonLedgerComponent } from './operation-real-time-skeleton-ledger.component';

describe('OperationRealTimeSkeletonLedgerComponent', () => {
    it('帳票の白地に、カードと同じ高さの骨組みの行を並べる', async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeSkeletonLedgerComponent],
        }).compileComponents();
        const fixture = TestBed.createComponent(
            OperationRealTimeSkeletonLedgerComponent,
        );
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('[aria-label="読み込み中"]')).not.toBeNull();
        const rows = el.querySelectorAll('[data-testid="skeleton-row"]');
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].className).toContain('tw-h-[67px]');
    });
});
