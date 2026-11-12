import { TestBed } from '@angular/core/testing';
import { TimetableFormationControlsComponent } from './timetable-formation-controls.component';

describe('TimetableFormationControlsComponent', () => {
    function create(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({
            imports: [TimetableFormationControlsComponent],
        });
        const fixture = TestBed.createComponent(
            TimetableFormationControlsComponent,
        );
        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }
        fixture.detectChanges();
        return fixture;
    }
    const q = (f: { nativeElement: HTMLElement }, selector: string) =>
        f.nativeElement.querySelector(selector);

    it('編成番号を打つと、その値を出力する', () => {
        const fixture = create({ formationNumber: '8713' });
        const emitted: string[] = [];
        fixture.componentInstance.formationNumberSubmit.subscribe((v) =>
            emitted.push(v),
        );
        const input = q(
            fixture,
            '[data-testid="formation-number-input"]',
        ) as HTMLInputElement;
        input.value = '8714';
        input.dispatchEvent(new Event('change'));
        expect(emitted).toEqual(['8714']);
    });

    it('編成が見つかるまでは駅の欄を出さない', () => {
        const hidden = create({ formationNumber: '8713', showStation: false });
        expect(hidden.nativeElement.textContent).not.toContain('駅で絞る');
        TestBed.resetTestingModule();
        const shown = create({ formationNumber: '8713', showStation: true });
        expect(shown.nativeElement.textContent).toContain('駅で絞る');
    });
});
