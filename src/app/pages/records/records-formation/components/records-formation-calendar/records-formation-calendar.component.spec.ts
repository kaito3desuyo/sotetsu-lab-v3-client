import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecordsFormationCalendarComponent } from './records-formation-calendar.component';

const sighting = (
    id: string,
    operationNumber: string,
    extra: Record<string, unknown> = {},
) => ({ operationSightingId: id, operation: { operationNumber }, ...extra });

function create(sightingsByDate: Record<string, unknown[]>) {
    TestBed.configureTestingModule({
        imports: [RecordsFormationCalendarComponent],
        providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(RecordsFormationCalendarComponent);
    fixture.componentRef.setInput('formationNumber', '10701');
    fixture.componentRef.setInput('month', '2026-11');
    fixture.componentRef.setInput('today', '2026-11-19');
    fixture.componentRef.setInput('sightingsByDate', sightingsByDate);
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

    it('推定の目撃（carriedFromSightingId 付き）の運番には「?」が付き、直接の目撃には付かない', () => {
        const fixture = create({
            '2026-11-05': [
                sighting('a', '71'),
                sighting('b', '73', { carriedFromSightingId: 'a' }),
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
});
