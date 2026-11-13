/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * 文字色はトークンだけを使う（docs/design.md Theme「--color-ink 本文」「--color-muted より薄い文字色を作らない」）。
 * Tailwind のパレットの灰（tw-text-grey-500 = #9e9e9e など）は紙の上で読みにくく、ページごとに灰が違って見えた
 * （Fable の一貫性レビュー 2026-11-13・3-5）。本文は tw-text-ink、補足は tw-text-muted にする。
 * 線や図形の色（svg）はこの決まりの外なので、`<svg` の開きタグに付いたものは数えない。
 */
const APP_DIR = __dirname;

function templateFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return templateFiles(path);
        return /\.component\.(html|ts)$/.test(name) ? [path] : [];
    });
}

describe('文字色（docs/design.md Theme）', () => {
    it('テンプレートで Tailwind の灰の文字色（tw-text-grey-*）を使わない', () => {
        const found = templateFiles(APP_DIR).flatMap((file) => {
            const source = readFileSync(file, 'utf8').replace(
                /<svg\b[^>]*>/g,
                '',
            );
            return Array.from(source.matchAll(/tw-text-grey-\d+/g)).map(
                (m) => `${file.replace(APP_DIR, '')}: ${m[0]}`,
            );
        });

        expect(found).toEqual([]);
    });
});
