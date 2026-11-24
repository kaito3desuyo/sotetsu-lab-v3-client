import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecordsFormationCalendarComponent } from './records-formation-calendar.component';

// api が返す形（運用 ID と運用を持つ）
const sighting = (
    id: string,
    operationNumber: string,
    extra: Record<string, unknown> = {},
) => ({
    operationSightingId: id,
    operationId: `op-${operationNumber}`,
    operation: { operationId: `op-${operationNumber}`, operationNumber },
    ...extra,
});
// 運用が付いていない目撃
const sightingWithoutOperation = (id: string) => ({
    operationSightingId: id,
    operationId: 'op-x',
});

function create(
    sightingsByDate: Record<string, unknown[]>,
    extra: Record<string, unknown> = {},
) {
    TestBed.configureTestingModule({
        imports: [RecordsFormationCalendarComponent],
        providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(RecordsFormationCalendarComponent);
    fixture.componentRef.setInput('formationNumber', '10701');
    fixture.componentRef.setInput('month', '2026-11');
    fixture.componentRef.setInput('today', '2026-11-19');
    fixture.componentRef.setInput('sightingsByDate', sightingsByDate);
    for (const [k, v] of Object.entries(extra)) {
        fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    return fixture;
}
const cell = (fixture: { nativeElement: HTMLElement }, date: string) =>
    fixture.nativeElement.querySelector<HTMLElement>(`[data-date="${date}"]`)!;

describe('RecordsFormationCalendarComponent', () => {
    it('曜日を月から日の順に出す', () => {
        const fixture = create({});
        const headers = [
            ...fixture.nativeElement.querySelectorAll('[role="columnheader"]'),
        ].map((e) => (e as HTMLElement).textContent?.trim());
        expect(headers).toEqual(['月', '火', '水', '木', '金', '土', '日']);
    });

    it('目撃のある日のマスはその日の編成別時刻表へのリンクになり、無い日はリンクにならない', () => {
        const fixture = create({ '2026-11-05': [sighting('a', '71')] });
        const withSighting = cell(fixture, '2026-11-05');
        expect(withSighting.tagName).toBe('A');
        expect(withSighting).toHaveAttribute(
            'href',
            '/timetable/formation;formation_number=10701;date=2026-11-05',
        );
        const without = cell(fixture, '2026-11-06');
        expect(without.tagName).not.toBe('A');
        expect(without).not.toHaveAttribute('href');
    });

    it('1 日の運番を受け持った順に並べ、2 個目から「›」を前に置く', () => {
        const fixture = create({
            '2026-11-05': [sighting('a', '71'), sighting('b', '72')],
        });
        const text = cell(fixture, '2026-11-05').textContent?.replace(
            /\s+/g,
            '',
        );
        expect(text).toBe('5' + '71' + '›' + '72');
    });

    it('運用が付いていない目撃は「不明」と出し、マスはリンクのままにする（空のリンクにしない）', () => {
        const fixture = create({
            '2026-11-05': [sightingWithoutOperation('a')],
        });
        const day = cell(fixture, '2026-11-05');
        expect(day.tagName).toBe('A');
        expect(day).toHaveTextContent('不明');
        expect(day.querySelector('app-operation-number-tag')).toBeNull();
    });

    it('推定の目撃（sightedAsOperation 付き）の運番には「?」が付き、直接の目撃には付かない', () => {
        const fixture = create({
            '2026-11-05': [
                sighting('a', '71'),
                sighting('b', '73', {
                    carriedFromSightingId: 'a',
                    sightedAsOperation: {
                        operationId: 'o',
                        operationNumber: '71',
                    },
                }),
            ],
        });
        const tags = [
            ...cell(fixture, '2026-11-05').querySelectorAll(
                'app-operation-number-tag',
            ),
        ].map((e) => e.textContent?.replace(/\s+/g, ''));
        expect(tags).toEqual(['71', '73?']);
    });

    it('月の外の枠は空で、月の日数ぶんのマスだけがある', () => {
        const fixture = create({});
        expect(
            fixture.nativeElement.querySelectorAll('[data-date]').length,
        ).toBe(30);
    });

    it('土曜・日曜・祝日の数字に赤の印を付け、祝日名を添える（11/3 は文化の日・火曜）', () => {
        const fixture = create({}, { holidays: { '2026-11-03': '文化の日' } });
        const red = (date: string) =>
            cell(fixture, date)
                .querySelector('[data-testid="day-number"]')!
                .getAttribute('data-red');
        expect(red('2026-11-03')).toBe('true');
        expect(red('2026-11-07')).toBe('true');
        expect(red('2026-11-08')).toBe('true');
        expect(red('2026-11-04')).toBeNull();
        expect(cell(fixture, '2026-11-03')).toHaveTextContent('文化の日');
        expect(cell(fixture, '2026-11-04')).not.toHaveTextContent('文化の日');
    });

    it('土曜・日曜の見出しも赤にする', () => {
        const fixture = create({});
        const headers = [
            ...fixture.nativeElement.querySelectorAll('[role="columnheader"]'),
        ] as HTMLElement[];
        expect(
            headers.map((h) => h.className.includes('tw-text-accent-deep')),
        ).toEqual([false, false, false, false, false, true, true]);
    });

    it('今日のマスに今日の印を付ける', () => {
        const fixture = create({});
        expect(
            cell(fixture, '2026-11-19').querySelector(
                '[data-testid="day-number"]',
            )!,
        ).toHaveAttribute('data-today', 'true');
        expect(
            cell(fixture, '2026-11-18').querySelector(
                '[data-testid="day-number"]',
            )!,
        ).not.toHaveAttribute('data-today');
    });

    it('上端に前の月・今の月・次の月を出し、‹ › で shift を出す', () => {
        const fixture = create({}, { canGoNext: true });
        const nav = fixture.nativeElement.querySelector(
            '[data-testid="calendar-nav"]',
        );
        expect(nav).toHaveTextContent('10月');
        expect(nav).toHaveTextContent('2026年11月');
        expect(nav).toHaveTextContent('12月');
        const emitted: number[] = [];
        fixture.componentInstance.shift.subscribe((d: number) =>
            emitted.push(d),
        );
        fixture.nativeElement
            .querySelector('[data-testid="calendar-prev"]')
            .click();
        fixture.nativeElement
            .querySelector('[data-testid="calendar-next"]')
            .click();
        expect(emitted).toEqual([-1, 1]);
    });

    it('今の月より先へは進めない（canGoNext が false なら次の月のボタンは無効）', () => {
        const fixture = create({}, { canGoNext: false });
        expect(
            fixture.nativeElement.querySelector('[data-testid="calendar-next"]')
                .disabled,
        ).toBe(true);
    });
});
