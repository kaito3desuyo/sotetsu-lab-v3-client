/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * 読み込み中のバー（mat-progress-bar）は、スクリーンリーダーに「読み込み中」と伝わる名前を持つ。
 * 名前が無いと、ただの進捗バーとして名前なしで読まれる。
 */
const APP_DIR = __dirname;

/** src/app 以下で mat-progress-bar を使うテンプレートをすべて集める（足し忘れを拾う） */
function templateFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return templateFiles(path);
        return /\.html$/.test(name) &&
            readFileSync(path, 'utf8').includes('<mat-progress-bar')
            ? [path.replace(APP_DIR + '/', '')]
            : [];
    });
}

const TEMPLATES = templateFiles(APP_DIR);

/** `<mat-progress-bar` から `>` までの開きタグ */
function progressBarTags(source: string): string[] {
    return Array.from(source.matchAll(/<mat-progress-bar\b[^>]*>/g)).map(
        (m) => m[0],
    );
}

describe('読み込み中のバーの名前', () => {
    it('mat-progress-bar を使うテンプレートを見つけている（12 か所）', () => {
        expect(TEMPLATES.length).toBeGreaterThanOrEqual(12);
    });

    it.each(TEMPLATES)(
        '%s の mat-progress-bar は「読み込み中」の名前を持つ',
        (file) => {
            const tags = progressBarTags(
                readFileSync(join(APP_DIR, file), 'utf8'),
            );

            expect(tags.length).toBeGreaterThan(0);
            for (const tag of tags) {
                expect(tag).toContain('aria-label="読み込み中"');
            }
        },
    );
});
