import '@testing-library/jest-dom';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormationNumberLinkComponent } from './formation-number-link.component';

describe('FormationNumberLinkComponent', () => {
    function create(inputs: Record<string, unknown>): HTMLElement {
        TestBed.configureTestingModule({
            imports: [FormationNumberLinkComponent],
            providers: [provideRouter([])],
        });
        const fixture = TestBed.createComponent(FormationNumberLinkComponent);
        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('編成別時刻表へのリンクにし、列車番号と同じ下線を引いて色は周りから継ぐ', () => {
        const el = create({ formationNumber: '10701' });
        const a = el.querySelector('a');

        expect(a).toHaveTextContent('10701');
        expect(a).toHaveAttribute(
            'href',
            '/timetable/formation;formation_number=10701',
        );
        expect(a?.classList).toContain('tw-underline');
        expect(a?.classList).toContain('[color:inherit]');
    });

    it('日付があればその日で開く', () => {
        const el = create({ formationNumber: '10701', date: '2026-11-07' });

        expect(el.querySelector('a')).toHaveAttribute(
            'href',
            '/timetable/formation;formation_number=10701;date=2026-11-07',
        );
    });

    it('目撃時刻（at）を渡すと、日本時間の運行日で開く（4 時前は前日）', () => {
        const el = create({
            formationNumber: '10701',
            at: '2026-11-07T18:30:00.000Z', // 日本時間 11/8 3:30 → 運行日は 11/7
        });

        expect(el.querySelector('a')).toHaveAttribute(
            'href',
            '/timetable/formation;formation_number=10701;date=2026-11-07',
        );
    });

    it('編成番号が無いときや「不明」はリンクにしない', () => {
        expect(
            create({ formationNumber: '不明' }).querySelector('a'),
        ).toBeNull();
        TestBed.resetTestingModule();
        const el = create({ formationNumber: null });
        expect(el.querySelector('a')).toBeNull();
    });

    it('リンクは「編成 {番号}」の名前を持つ', () => {
        const el = create({ formationNumber: '8709' });

        expect(el.querySelector('a')).toHaveAttribute(
            'aria-label',
            '編成 8709',
        );
    });

    it('推測のときは「（推測）」を付ける（見える「?」はリンクの外に置く）', () => {
        const el = create({ formationNumber: '10706', inferred: true });

        expect(el.querySelector('a')).toHaveAttribute(
            'aria-label',
            '編成 10706（推測）',
        );
        expect(el.querySelector('a')).toHaveTextContent(/^10706$/);
    });

    it('リンクでない span には aria-label を付けない', () => {
        const el = create({ formationNumber: '不明' });

        expect(el.querySelector('a')).toBeNull();
        expect(el.querySelector('span')).not.toHaveAttribute('aria-label');
    });
});
