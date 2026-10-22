import { TestBed } from '@angular/core/testing';
import { SkeletonChipsComponent } from './skeleton-chips.component';

describe('SkeletonChipsComponent', () => {
    const create = (widths: readonly string[]) => {
        const fixture = TestBed.createComponent(SkeletonChipsComponent);
        fixture.componentRef.setInput('widths', widths);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('高さ 42px の行に、渡した幅のチップを 32px の高さで並べる', () => {
        const host = create(['tw-w-14', 'tw-w-24']);
        const chips = host.querySelectorAll('app-skeleton-bar');

        expect(host.classList).toContain('tw-h-[42px]');
        expect(chips).toHaveLength(2);
        expect(chips[0].classList).toContain('tw-h-8');
        expect(chips[0].classList).toContain('tw-w-14');
        expect(chips[1].classList).toContain('tw-w-24');
    });

    it('読み込み中と読み上げ、テストから探せる', () => {
        const host = create(['tw-w-14']);

        expect(host).toHaveAttribute('aria-label', '読み込み中');
        expect(host).toHaveAttribute('data-testid', 'filter-chips-skeleton');
    });
});
