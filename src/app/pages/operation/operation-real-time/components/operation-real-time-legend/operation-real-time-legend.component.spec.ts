import { TestBed } from '@angular/core/testing';
import { OperationRealTimeLegendComponent } from './operation-real-time-legend.component';

describe('OperationRealTimeLegendComponent', () => {
    it('推測した編成・運用番号の項目は、狭い幅で文だけが折り返す（320px の横スクロール）', () => {
        const fixture = TestBed.createComponent(
            OperationRealTimeLegendComponent,
        );
        fixture.detectChanges();

        const dt = Array.from(
            (fixture.nativeElement as HTMLElement).querySelectorAll('dt'),
        ).find((el) => el.textContent?.trim() === '10706?')!;
        const item = dt.parentElement!;
        const dd = item.querySelector('dd')!;

        expect(item.classList).not.toContain('tw-whitespace-nowrap');
        expect(item.classList).toContain('tw-min-w-0');
        expect(dt.classList).toContain('tw-whitespace-nowrap');
        expect(dt.classList).toContain('tw-shrink-0');
        expect(dd.classList).toContain('tw-min-w-0');
    });
});
