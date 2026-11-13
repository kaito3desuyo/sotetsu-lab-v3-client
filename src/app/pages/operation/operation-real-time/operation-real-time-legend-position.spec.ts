/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 凡例の帯は操作帯の要約の行のすぐ下に貼り付ける（docs/design.md ロック済みページ「凡例は帯の直下」）。
 * 要約の行は罫線込みで 40px（--control-band-offset）なので、ヘッダー 48px（md 以上 64px）に足した所が上端。
 * 以前は 49px・65px で 1px の隙間があった（Fable の一貫性レビュー 2026-11-13・3-16）。
 */
describe('リアルタイム運用情報の凡例の位置', () => {
    const source = readFileSync(
        join(__dirname, 'operation-real-time.component.html'),
        'utf8',
    );
    const legend =
        source.match(/<app-operation-real-time-legend\b[^>]*>/)?.[0] ?? '';

    it('ヘッダーと要約の行のすぐ下（隙間 0）に貼り付く', () => {
        expect(legend).toContain(
            ' tw-top-[calc(48px_+_var(--control-band-offset,0px))] ',
        );
        expect(legend).toContain(
            ' md:tw-top-[calc(64px_+_var(--control-band-offset,0px))] ',
        );
    });
});
