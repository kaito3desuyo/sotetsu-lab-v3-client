/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ログイン・新規登録もほかのページと同じ掟に乗せる（docs/design.md 余白の掟 1・面の掟）。
 * 以前は <main> が無く、mat-card の影と角丸 4px だった（Fable の一貫性レビュー 2026-11-13・3-11）。
 */
describe.each(['login/login', 'register/register'])(
    '%s.component.html の面',
    (name) => {
        const source = readFileSync(
            join(__dirname, `${name}.component.html`),
            'utf8',
        );

        it('ほかのページと同じ余白の <main> に置く', () => {
            expect(source).toMatch(
                /^<main\s+class="tw-flex tw-flex-col tw-gap-4 tw-p-4 md:tw-p-6 lg:tw-p-8 xl:tw-p-16"/,
            );
        });

        it('影の付く mat-card でなく、白いカード（tw-rounded-card）にする', () => {
            expect(source).not.toContain('<mat-card');
            expect(source).toMatch(/class="[^"]*tw-rounded-card tw-bg-white/);
        });
    },
);
