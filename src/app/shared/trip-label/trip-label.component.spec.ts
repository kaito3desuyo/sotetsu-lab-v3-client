import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TripLabelComponent } from './trip-label.component';

describe('TripLabelComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    const render = (link?: unknown[]) => {
        const fixture = TestBed.createComponent(TripLabelComponent);
        fixture.componentRef.setInput('tripClassName', '各停');
        fixture.componentRef.setInput('tripClassColor', '#000000');
        fixture.componentRef.setInput('tripNumber', '6000');
        fixture.componentRef.setInput('link', link);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('列車番号だけを下線付きのリンクにする（種別チップはリンクの外）', () => {
        const el = render([
            '/timetable/all-line',
            { calendar_id: 'c1', trip_direction: 0, trip_block_id: 'b1' },
        ]);
        const anchor = el.querySelector('a');
        expect(anchor?.textContent?.trim()).toBe('6000');
        expect(anchor?.classList).toContain('tw-underline');
        expect(anchor?.getAttribute('href')).toContain('/timetable/all-line');
        expect(anchor?.getAttribute('href')).toContain('trip_block_id=b1');
        expect(anchor?.querySelector('app-trip-class-chip')).toBeNull();
        expect(el.querySelector('app-trip-class-chip')?.textContent).toContain(
            '各停',
        );
    });

    it('link が無ければリンクにせず下線も引かない', () => {
        const el = render(undefined);
        expect(el.querySelector('a')).toBeNull();
        const number = el.querySelector('[data-trip-number]');
        expect(number?.textContent?.trim()).toBe('6000');
        expect(number?.classList).not.toContain('tw-underline');
    });
});
