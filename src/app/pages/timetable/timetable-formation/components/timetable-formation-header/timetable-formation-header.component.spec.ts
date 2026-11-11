import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TimetableFormationHeaderComponent } from './timetable-formation-header.component';

describe('TimetableFormationHeaderComponent', () => {
    function create(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({
            imports: [TimetableFormationHeaderComponent],
            providers: [provideRouter([])],
        });
        const fixture = TestBed.createComponent(
            TimetableFormationHeaderComponent,
        );
        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }
        fixture.detectChanges();
        return fixture;
    }
    const text = (f: { nativeElement: HTMLElement }): string =>
        f.nativeElement.textContent?.replace(/\s+/g, ' ') ?? '';

    it('編成・形式・会社と、その日の目撃の並びを出す', () => {
        const fixture = create({
            formationNumber: '8713',
            formation: { formationId: 'f', formationNumber: '8713' },
            annotation: '8000系・相鉄',
            sightings: [
                { time: '9:06', operationNumber: '55' },
                { time: '15:40', operationNumber: '59' },
            ],
        });
        const t = text(fixture);
        expect(t).toContain('8000系・相鉄');
        expect(t).toContain('9:06 55 で目撃');
        expect(t).toContain('15:40 59 で目撃');
    });

    it('いまの運用に根拠を添え、「?」を付ける', () => {
        const fixture = create({
            formation: { formationId: 'f' },
            currentOperationNumber: '55',
            currentBasisLabel: '順送り?',
            currentInferred: true,
        });
        const t = text(fixture);
        expect(t).toContain('55?');
        expect(t).toContain('（順送り?）');
    });

    it('編成番号を打つと、その値を出力する', () => {
        const fixture = create({ formationNumber: '8713' });
        const emitted: string[] = [];
        fixture.componentInstance.formationNumberSubmit.subscribe((v) =>
            emitted.push(v),
        );
        const input = fixture.nativeElement.querySelector(
            '[data-testid="formation-number-input"]',
        ) as HTMLInputElement;
        input.value = '8714';
        input.dispatchEvent(new Event('change'));
        expect(emitted).toEqual(['8714']);
    });
});
