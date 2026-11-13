/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * 文の中のリンクと補助の導線は Tertiary（紺の字＋下線）にする（docs/design.md CTA voice）。
 * 見た目は src/styles.scss の .app-link と、読むページの .app-prose a にある。
 * 以前は使い方・用語集・規約がブラウザ既定の青、運用表の「行路図を見る ›」が下線なしの黒だった
 * （Fable の一貫性レビュー 2026-11-13・3-13）。
 */
const APP_DIR = __dirname;
const READING_PAGES = [
    'pages/guide/guide.component.html',
    'pages/glossary/glossary.component.html',
    'pages/disclaimer/disclaimer.component.html',
    'pages/privacy-policy/privacy-policy.component.html',
];

function templateFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return templateFiles(path);
        return /\.component\.(html|ts)$/.test(name) ? [path] : [];
    });
}

describe('リンクの見た目（docs/design.md CTA voice Tertiary）', () => {
    it('.app-link と .app-prose a は紺の字に下線', () => {
        const scss = readFileSync(join(APP_DIR, '..', 'styles.scss'), 'utf8');
        expect(scss).toMatch(
            /\.app-link,\s*\.app-prose a \{[^}]*color: var\(--color-structure\);[^}]*text-decoration-line: underline;/,
        );
    });

    it('読むページの外で、class も Material のボタンの印も無い素の <a> を置かない', () => {
        const bare = templateFiles(APP_DIR)
            .map((file) => file.replace(APP_DIR + '/', ''))
            .filter((where) => !READING_PAGES.includes(where))
            .flatMap((where) =>
                Array.from(
                    readFileSync(join(APP_DIR, where), 'utf8')
                        .replace(/<!--[\s\S]*?-->/g, '')
                        .matchAll(/<a\b[^>]*>/g),
                )
                    .map((m) => m[0].replace(/\s+/g, ' '))
                    .filter(
                        (tag) =>
                            !/\sclass=|\s\[class\]=|\smat-[\w-]*(button|item)\b/.test(
                                tag,
                            ),
                    )
                    .map((tag) => `${where}: ${tag}`),
            );

        expect(bare).toEqual([]);
    });

    it.each([
        'pages/operation/operation-table/components/operation-table-card/operation-table-card.component.html',
        'pages/train-location/train-location.component.html',
        'pages/login/login.component.html',
        'pages/register/register.component.html',
    ])('%s の補助の導線は .app-link', (file) => {
        const source = readFileSync(join(APP_DIR, file), 'utf8');
        expect(source).toMatch(/<a\b[^>]*class="[^"]*\bapp-link\b/);
        expect(source).not.toMatch(/<a\b[^>]*\smat-button\b/);
    });
});
