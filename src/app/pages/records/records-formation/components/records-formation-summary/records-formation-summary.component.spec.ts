import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecordsFormationSummaryComponent } from './records-formation-summary.component';

function create(inputs: Record<string, unknown>) {
    TestBed.configureTestingModule({
        imports: [RecordsFormationSummaryComponent],
        providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(RecordsFormationSummaryComponent);
    for (const [k, v] of Object.entries(inputs)) {
        fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    return fixture;
}
const summary = (sightingTime: string, number = '73') =>
    ({
        latestSighting: {
            sightingTime,
            operation: { operationNumber: number },
        },
        expectedSighting: null,
    }) as never;

describe('RecordsFormationSummaryComponent', () => {
    it('今日の目撃があれば「今日」と運番を出す', () => {
        const fixture = create({
            formationNumber: '10701',
            // 日本時間 11/19 10:00
            summary: summary('2026-11-19T01:00:00Z'),
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent('今日 11/19');
        expect(fixture.nativeElement).toHaveTextContent('73');
    });

    it('今日の目撃が無ければ「最後に見た日」とその日の運番を出す', () => {
        const fixture = create({
            formationNumber: '10701',
            summary: summary('2026-11-10T01:00:00Z', '41'),
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent('最後に見た日 11/10');
        expect(fixture.nativeElement).toHaveTextContent('41');
        expect(
            fixture.nativeElement.querySelector('[data-testid="summary-link"]'),
        ).toHaveAttribute(
            'href',
            '/timetable/formation;formation_number=10701;date=2026-11-10',
        );
    });

    it('一度も目撃が無ければ「目撃の記録はありません」', () => {
        const fixture = create({
            formationNumber: '10701',
            summary: { latestSighting: null, expectedSighting: null },
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent(
            '目撃の記録はありません',
        );
    });
});
