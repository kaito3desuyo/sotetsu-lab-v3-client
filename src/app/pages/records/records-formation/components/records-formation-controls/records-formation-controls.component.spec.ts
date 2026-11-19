import { TestBed } from '@angular/core/testing';
import { RecordsFormationControlsComponent } from './records-formation-controls.component';

describe('RecordsFormationControlsComponent', () => {
    function create(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({
            imports: [RecordsFormationControlsComponent],
        });
        const fixture = TestBed.createComponent(
            RecordsFormationControlsComponent,
        );
        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }
        fixture.detectChanges();
        return fixture;
    }
    const button = (
        fixture: { nativeElement: HTMLElement },
        testid: string,
    ): HTMLButtonElement =>
        fixture.nativeElement.querySelector(`[data-testid="${testid}"]`)!;

    it('月を「2026年11月」の形で出す', () => {
        const fixture = create({ month: '2026-11' });
        expect(button(fixture, 'month-label')).toHaveTextContent(/2026年11月/);
    });

    it('前の月・次の月のボタンで向きを出力する', () => {
        const fixture = create({ month: '2026-10', canGoNext: true });
        const shifts: number[] = [];
        fixture.componentInstance.shift.subscribe((v) => shifts.push(v));
        button(fixture, 'prev-month').click();
        button(fixture, 'next-month').click();
        expect(shifts).toEqual([-1, 1]);
    });

    it('次の月へ進めないときは、次の月のボタンを無効にする', () => {
        const fixture = create({ month: '2026-11', canGoNext: false });
        expect(button(fixture, 'next-month').disabled).toBe(true);
        expect(button(fixture, 'prev-month').disabled).toBe(false);
    });

    it('候補を選ばずに Enter を押すと、打った値を出力する', () => {
        const fixture = create({ formationNumber: null });
        const emitted: string[] = [];
        fixture.componentInstance.formationNumberSubmit.subscribe((v) =>
            emitted.push(v),
        );
        const input = button(fixture, 'formation-number-input');
        input.dispatchEvent(new Event('focusin'));
        input.value = '10701';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(emitted).toEqual(['10701']);
    });
});
