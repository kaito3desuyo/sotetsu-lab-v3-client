/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * ボタンの見た目（docs/design.md CTA voice）をテンプレートから確かめる。
 * 主ボタンはオレンジ塗り（app-button-primary）、副ボタンは白地に紺の 2px 枠（app-button-secondary）。
 * 見た目は src/styles.scss のグローバルな class にあり、`<a>` のボタンにも同じ class を付ける。
 */
const APP_DIR = join(__dirname, '..', '..');

function templateFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return templateFiles(path);
        return /\.component\.(html|ts)$/.test(name) ? [path] : [];
    });
}

/** `<button` か `<a` から `>` までの開きタグのうち、指定の属性を持つもの */
function openingTags(source: string, attribute: string): string[] {
    return Array.from(source.matchAll(/<(?:button|a)\b[^>]*>/g))
        .map((m) => m[0])
        .filter((tag) => new RegExp(`\\s${attribute}(\\s|>|=)`).test(tag));
}

describe('ボタンの見た目（docs/design.md CTA voice）', () => {
    it('枠線のボタン（mat-stroked-button）はすべて副ボタンの class を付ける', () => {
        const missing = templateFiles(APP_DIR).flatMap((file) =>
            openingTags(readFileSync(file, 'utf8'), 'mat-stroked-button')
                .filter((tag) => !tag.includes('app-button-secondary'))
                .map((tag) => `${file.replace(APP_DIR, '')}: ${tag}`),
        );

        expect(missing).toEqual([]);
    });

    it.each([
        'pages/login/login.component.html',
        'pages/register/register.component.html',
        'shared/operation-post-card/operation-post-form.component.html',
        'shared/timetable-post-card/timetable-post-card.component.html',
    ])('%s の主ボタンは主ボタンの class で、紺塗り・影付きにしない', (file) => {
        const source = readFileSync(join(APP_DIR, file), 'utf8');

        expect(openingTags(source, 'mat-raised-button')).toEqual([]);
        const flat = openingTags(source, 'mat-flat-button');
        expect(flat.length).toBeGreaterThan(0);
        for (const tag of flat) {
            expect(tag).toContain('app-button-primary');
            expect(tag).not.toMatch(/color="primary"/);
        }
    });

    // 行ごとの投稿ボタン（docs/design.md 操作カード）: アイコンだけのボタンで、どのページも muted・アイコン 24px
    it('行ごとの投稿ボタン（edit_note のアイコンだけのボタン）は muted で、アイコンを縮めない', () => {
        const buttons = templateFiles(APP_DIR).flatMap((file) =>
            Array.from(
                readFileSync(file, 'utf8').matchAll(
                    /(<button\b[^>]*\smat-icon-button[^>]*>)\s*(<mat-icon\b[^>]*>)\s*edit_note/g,
                ),
            ).map((m) => ({
                where: file.replace(APP_DIR, ''),
                button: m[1],
                icon: m[2],
            })),
        );

        expect(buttons.length).toBeGreaterThanOrEqual(4);
        for (const { where, button, icon } of buttons) {
            expect(`${where}: ${button}`).toContain('!tw-text-muted');
            expect(`${where}: ${icon}`).not.toMatch(/18px/);
        }
    });
});
