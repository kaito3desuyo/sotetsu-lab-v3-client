/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * 見出しの階段（docs/design.md Typography「見出しの階段」）をテンプレートから確かめる。
 * h2 は 18px・700、h3 は 16px・700、色は ink（body から継ぐ）。カードの小見出しは 12px・700・muted で、見出しの段ではない。
 * 以前は h2 がページによって 14〜24px で、太さも色も違った（Fable の一貫性レビュー 2026-11-13・3-12）。
 * 読むページ（使い方・用語集・利用規約・プライバシーポリシー）は .app-prose（src/styles.scss）で本文 16px と見出しを当てる。
 */
const APP_DIR = __dirname;
const READING_PAGES = [
    'pages/guide/guide.component.html',
    'pages/glossary/glossary.component.html',
    'pages/disclaimer/disclaimer.component.html',
    'pages/privacy-policy/privacy-policy.component.html',
];
// 見出しの段でないもの: 色の帯の中の白い字（ダイヤの帯）と、タブの形の列見出し（リアルタイム運用情報）
const NOT_A_STEP = [
    'shared/calendar-band/calendar-band.component.ts',
    'pages/operation/operation-real-time/operation-real-time.component.html',
];

function templateFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return templateFiles(path);
        return /\.component\.(html|ts)$/.test(name) ? [path] : [];
    });
}

function headings(level: 'h2' | 'h3' | 'h4'): { where: string; tag: string }[] {
    return templateFiles(APP_DIR)
        .map((file) => file.replace(APP_DIR + '/', ''))
        .filter((where) => !NOT_A_STEP.includes(where))
        .flatMap((where) =>
            Array.from(
                readFileSync(join(APP_DIR, where), 'utf8').matchAll(
                    new RegExp(`<${level}\\b[^>]*>`, 'g'),
                ),
            ).map((m) => ({ where, tag: m[0].replace(/\s+/g, ' ') })),
        );
}

function classOf(tag: string): string[] {
    // `!tw-text-base` のように重要度を上げた class も同じに数える（.mat-typography の中で要る）
    return (tag.match(/\sclass="([^"]*)"/)?.[1] ?? '')
        .split(/\s+/)
        .map((c) => c.replace(/^!/, ''));
}

describe('見出しの階段（docs/design.md Typography）', () => {
    it('class を付けた h2 は 18px・700（tw-text-lg tw-font-bold）', () => {
        const wrong = headings('h2')
            .filter(({ tag }) => /\sclass=/.test(tag))
            .filter(({ tag }) => {
                const c = classOf(tag);
                return !(
                    c.includes('tw-text-lg') && c.includes('tw-font-bold')
                );
            })
            .map(({ where, tag }) => `${where}: ${tag}`);

        expect(wrong).toEqual([]);
    });

    it('class を付けた h3 は 16px・700 か、カードの小見出し（12px・700・muted）', () => {
        const wrong = headings('h3')
            .filter(({ tag }) => /\sclass=/.test(tag))
            .filter(({ tag }) => {
                const c = classOf(tag);
                const step =
                    c.includes('tw-text-base') && c.includes('tw-font-bold');
                const label =
                    c.includes('tw-text-xs') &&
                    c.includes('tw-font-bold') &&
                    c.includes('tw-text-muted');
                return !(step || label);
            })
            .map(({ where, tag }) => `${where}: ${tag}`);

        expect(wrong).toEqual([]);
    });

    it('Material の見出しの class（mat-h2・mat-h3）を使わない', () => {
        const found = [...headings('h2'), ...headings('h3')]
            .filter(({ tag }) => /\bmat-h[23]\b/.test(tag))
            .map(({ where, tag }) => `${where}: ${tag}`);

        expect(found).toEqual([]);
    });

    it('class の無い h2・h3・h4 は読むページの .app-prose の中にだけ置く', () => {
        const bare = [...headings('h2'), ...headings('h3'), ...headings('h4')]
            .filter(({ tag }) => !/\sclass=/.test(tag))
            .filter(({ tag }) => !/\smatSubheader\b/.test(tag))
            .map(({ where }) => where);

        expect([...new Set(bare)].sort()).toEqual([...READING_PAGES].sort());
    });

    it.each(READING_PAGES)(
        '%s は .app-prose で、mat-typography を使わない',
        (file) => {
            const source = readFileSync(join(APP_DIR, file), 'utf8');
            expect(source).toMatch(/class="app-prose\b/);
            expect(source).not.toContain('mat-typography');
        },
    );

    it('.app-prose は本文 16px・h2 18px・h3 16px で、見出しは 700', () => {
        const scss = readFileSync(join(APP_DIR, '..', 'styles.scss'), 'utf8');
        const block = scss.slice(scss.indexOf('.app-prose {'));
        expect(block).toMatch(/^\.app-prose \{\s*font-size: 16px;/);
        expect(block).toMatch(
            /h2 \{[^}]*font-size: 18px;[^}]*font-weight: 700;/,
        );
        expect(block).toMatch(
            /h3,\s*h4 \{[^}]*font-size: 16px;[^}]*font-weight: 700;/,
        );
    });

    it.each([
        'pages/login/login.component.html',
        'pages/register/register.component.html',
        'pages/library/library-vehicle/library-vehicle.component.html',
    ])('%s にページ名の h2 を置かない（ヘッダーに出ている）', (file) => {
        expect(readFileSync(join(APP_DIR, file), 'utf8')).not.toMatch(/<h2\b/);
    });

    it('相鉄の車両の形式名を色で分けない', () => {
        const colored = headings('h4')
            .filter(({ where }) => where.startsWith('pages/library/'))
            .filter(({ tag }) =>
                /\b(red|teal|blue|indigo|deep-orange)\b/.test(tag),
            );

        expect(colored).toEqual([]);
    });
});
