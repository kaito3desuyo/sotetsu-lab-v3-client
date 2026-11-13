/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 重なって出る物の角丸はカードと同じ 8px（docs/design.md 面の掟）。ダイアログは四隅、下から出るシートは上の 2 隅。
 * 以前はダイアログが Material 既定の 4px、シートはスマホで 0・PC で上だけ 4px だった（Fable の一貫性レビュー 2026-11-13・3-17）。
 * Material はスマホ幅のシートに角丸の class を付けないので、上の 2 隅は自前で丸める。
 */
const scss = readFileSync(join(__dirname, '..', 'styles.scss'), 'utf8');

describe('ダイアログとシートの角丸（docs/design.md 面の掟）', () => {
    it('ダイアログの角を 8px にする', () => {
        expect(scss).toMatch(
            /@include mat\.dialog-overrides\(\s*\(\s*container-shape: 8px,?\s*\)\s*\)/,
        );
    });

    it('下から出るシートの角を 8px にする', () => {
        expect(scss).toMatch(
            /@include mat\.bottom-sheet-overrides\(\s*\(\s*container-shape: 8px,?\s*\)\s*\)/,
        );
    });

    it('スマホ幅のシートも上の 2 隅を丸める', () => {
        expect(scss).toMatch(
            /\.mat-bottom-sheet-container \{[^}]*border-top-left-radius: var\(--mat-bottom-sheet-container-shape\);[^}]*border-top-right-radius: var\(--mat-bottom-sheet-container-shape\);/,
        );
    });
});
