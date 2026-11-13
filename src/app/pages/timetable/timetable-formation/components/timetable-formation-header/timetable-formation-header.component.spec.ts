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

    it('運用番号のチップは行路図へのリンク。明日の見込みは明日の運用 ID で開く', () => {
        const fixture = create({
            formationNumber: '8713',
            formation: { formationId: 'f', formationNumber: '8713' },
            sightings: [{ time: '09:06', operationNumber: '55' }],
            currentOperationNumber: '59',
            operationIdByNumber: { '55': 'op-55', '59': 'op-59' },
            tomorrowOperationNumber: '60',
            tomorrowOperationId: 'op-60-tomorrow',
        });
        const hrefs = Array.from(
            (fixture.nativeElement as HTMLElement).querySelectorAll(
                'app-operation-number-tag a',
            ),
        ).map((a) => a.getAttribute('href'));

        expect(hrefs).toEqual([
            '/operation/route-diagram;operation_id=op-55',
            '/operation/route-diagram;operation_id=op-59',
            '/operation/route-diagram;operation_id=op-60-tomorrow',
        ]);
    });

    it('運用 ID が分からないチップはリンクにしない', () => {
        const fixture = create({
            formationNumber: '8713',
            formation: { formationId: 'f', formationNumber: '8713' },
            currentOperationNumber: '59',
        });

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                'app-operation-number-tag a',
            ),
        ).toBeNull();
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

    it('乗り移りのある日は、運用を「16K → 15K」とチップで並べる', () => {
        const fixture = create({
            formation: { formationId: 'f' },
            currentOperationNumber: '15K',
            currentBasisLabel: 'ダイヤの乗り移り',
            operationChain: [
                { operationNumber: '16K', inferred: false },
                { operationNumber: '15K', inferred: false },
            ],
        });
        const chain = (fixture.nativeElement as HTMLElement).querySelector(
            '[data-testid="operation-chain"]',
        );
        expect(chain).not.toBeNull();
        expect(chain?.querySelectorAll('app-operation-number-tag').length).toBe(
            2,
        );
        expect(chain?.textContent?.replace(/\s+/g, ' ')).toContain('16K → 15K');
    });
});
