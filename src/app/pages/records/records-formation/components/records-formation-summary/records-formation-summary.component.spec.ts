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
        expect(fixture.nativeElement).toHaveTextContent('10701');
        expect(fixture.nativeElement).toHaveTextContent('今日の目撃');
        expect(fixture.nativeElement).toHaveTextContent('10:00');
        expect(fixture.nativeElement).toHaveTextContent('73');
    });

    it('今日の目撃が無ければ「最後に見た日」とその日の運番を出す', () => {
        const fixture = create({
            formationNumber: '10701',
            summary: summary('2026-11-10T01:00:00Z', '41'),
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent('最後の目撃');
        expect(fixture.nativeElement).toHaveTextContent('11/10 10:00');
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

    it('同日の引き継ぎで推定した運番は、元の目撃でなく推定した今の運番に「?」を付けて出す', () => {
        // api の実際の形: latestSighting は元の目撃（運番 41）、推定した今の運番は expectedSighting（運番 73）
        const fixture = create({
            formationNumber: '10701',
            summary: {
                latestSighting: {
                    operationSightingId: 's1',
                    sightingTime: '2026-11-19T01:00:00Z',
                    operation: { operationId: 'op-41', operationNumber: '41' },
                    formation: { formationNumber: '10701' },
                },
                expectedSighting: {
                    operation: { operationId: 'op-73', operationNumber: '73' },
                    formation: { formationNumber: '10701' },
                },
                sightedAsOperation: {
                    operationId: 'op-41',
                    operationNumber: '41',
                },
            },
            today: '2026-11-19',
        });
        const tag = fixture.nativeElement.querySelector(
            'app-operation-number-tag',
        );
        expect(tag).toHaveTextContent('73');
        expect(tag).not.toHaveTextContent('41');
        expect(tag).toHaveTextContent('?');
    });

    it('引き継ぎで推定できる運番が無ければ運番は不明と出す', () => {
        const fixture = create({
            formationNumber: '10701',
            summary: {
                latestSighting: {
                    sightingTime: '2026-11-19T01:00:00Z',
                    operation: { operationId: 'op-41', operationNumber: '41' },
                },
                expectedSighting: null,
                sightedAsOperation: {
                    operationId: 'op-41',
                    operationNumber: '41',
                },
            },
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent('不明');
        expect(fixture.nativeElement).not.toHaveTextContent('41');
    });

    it('形式・会社を番号の横に出し、解かれた日があれば「まで」を続ける', () => {
        const fixture = create({
            formationNumber: '7710',
            summary: summary('2019-10-19T01:00:00Z', '41'),
            today: '2026-11-19',
            latestPeriod: {
                startDate: '2019-05-13',
                endDate: '2019-10-14',
                vehicleType: '7000',
                agencyName: '相鉄',
                cars: [],
            },
        });
        expect(
            fixture.nativeElement.querySelector('[data-testid="annotation"]'),
        ).toHaveTextContent('7000・相鉄・2019/10/14 まで');
    });

    it('今も続く編成には「まで」を付けない', () => {
        const fixture = create({
            formationNumber: '10701',
            summary: summary('2026-11-19T01:00:00Z'),
            today: '2026-11-19',
            latestPeriod: {
                startDate: null,
                endDate: null,
                vehicleType: '10000',
                agencyName: '相鉄',
                cars: [],
            },
        });
        const annotation = fixture.nativeElement.querySelector(
            '[data-testid="annotation"]',
        );
        expect(annotation).toHaveTextContent('10000・相鉄');
        expect(annotation).not.toHaveTextContent('まで');
    });

    it('期間が取れなければ番号だけを出す', () => {
        const bare = create({
            formationNumber: '10701',
            summary: summary('2026-11-19T01:00:00Z'),
            today: '2026-11-19',
        });
        expect(
            bare.nativeElement.querySelector('[data-testid="annotation"]'),
        ).toBeNull();
    });

    it('「この月の記録」は、最後に見た日の月と今見ている月が同じなら出さない', () => {
        const same = create({
            formationNumber: '10701',
            summary: summary('2026-11-10T01:00:00Z'),
            today: '2026-11-19',
            month: '2026-11',
        });
        expect(
            same.nativeElement.querySelector('[data-testid="month-link"]'),
        ).toBeNull();
    });

    it('その月の記録へのリンクを出す（引退した編成の 2019 年の目撃なら 2019-03）', () => {
        const fixture = create({
            formationNumber: '8701',
            summary: summary('2019-03-10T01:00:00Z', '12'),
            today: '2026-11-19',
        });
        expect(
            fixture.nativeElement.querySelector('[data-testid="month-link"]'),
        ).toHaveAttribute(
            'href',
            '/records/formation;formation_number=8701;month=2019-03',
        );
    });

    it('日本時間 4 時前の目撃は前の日の月のリンクになる（4/1 の 2 時は 3 月）', () => {
        const fixture = create({
            formationNumber: '8701',
            summary: summary('2019-03-31T17:00:00Z', '12'),
            today: '2026-11-19',
        });
        expect(
            fixture.nativeElement.querySelector('[data-testid="month-link"]'),
        ).toHaveAttribute(
            'href',
            '/records/formation;formation_number=8701;month=2019-03',
        );
    });

    it('今年の日には年を付けない（今は 2026-11-19、最後の目撃は 2026-01-05）', () => {
        const fixture = create({
            formationNumber: '10701',
            summary: summary('2026-01-05T01:00:00Z'),
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent('1/5 10:00');
        expect(fixture.nativeElement).not.toHaveTextContent('2026/1/5');
    });

    it('今年でない日には年を付ける', () => {
        const fixture = create({
            formationNumber: '7710',
            summary: summary('2019-10-19T01:00:00Z', '41'),
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent('2019/10/19 10:00');
    });

    it('年の境目は 4 時区切りの鉄道日で数える（日本時間 1/1 の 2 時の目撃は前の年）', () => {
        const fixture = create({
            formationNumber: '10701',
            // 日本時間 2026-01-01 02:00 → 鉄道日は 2025-12-31
            summary: summary('2025-12-31T17:00:00Z'),
            today: '2026-11-19',
        });
        expect(fixture.nativeElement).toHaveTextContent('2025/12/31 02:00');
    });
});
