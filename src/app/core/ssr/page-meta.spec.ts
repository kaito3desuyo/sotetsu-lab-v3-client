import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { DEFAULT_DESCRIPTION, PageMeta } from './page-meta';

function meta(selector: string): string | null {
    return (
        TestBed.inject(DOCUMENT)
            .head.querySelector(`meta[${selector}]`)
            ?.getAttribute('content') ?? null
    );
}

describe('PageMeta', () => {
    let pageMeta: PageMeta;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        pageMeta = TestBed.inject(PageMeta);
    });

    it('題名・説明・OGP をそろえて入れる', () => {
        pageMeta.set({
            title: '運用表',
            description: '運用表の説明',
            url: '/operation/table;calendar_id=x',
        });

        expect(TestBed.inject(DOCUMENT).title).toBe('運用表 - Sotetsu Lab. v3');
        expect(meta('name="description"')).toBe('運用表の説明');
        expect(meta('property="og:title"')).toBe('運用表 - Sotetsu Lab. v3');
        expect(meta('property="og:description"')).toBe('運用表の説明');
        expect(meta('property="og:url"')).toBe(
            `${environment.siteUrl}/operation/table;calendar_id=x`,
        );
        expect(meta('property="og:image"')).toBe(
            `${environment.siteUrl}/assets/icons/android-chrome-512x512.png`,
        );
        expect(meta('property="og:type"')).toBe('website');
        expect(meta('property="og:site_name"')).toBe('Sotetsu Lab. v3');
        expect(meta('name="twitter:card"')).toBe('summary');
    });

    it('題名が空ならサイト名だけ・説明が無ければサイトの説明', () => {
        pageMeta.set({});

        expect(TestBed.inject(DOCUMENT).title).toBe('Sotetsu Lab. v3');
        expect(meta('name="description"')).toBe(DEFAULT_DESCRIPTION);
    });

    it('URL を渡さなければ og:url を外す', () => {
        pageMeta.set({ url: '/a' });
        pageMeta.set({ title: 'x' });

        expect(meta('property="og:url"')).toBeNull();
    });

    it('setTitle は題名と og:title だけ替える', () => {
        pageMeta.set({ title: '運用表', description: '説明' });
        pageMeta.setTitle('運用表（2026/3/14改正 平日）');

        expect(TestBed.inject(DOCUMENT).title).toBe(
            '運用表（2026/3/14改正 平日） - Sotetsu Lab. v3',
        );
        expect(meta('property="og:title"')).toBe(
            '運用表（2026/3/14改正 平日） - Sotetsu Lab. v3',
        );
        expect(meta('name="description"')).toBe('説明');
    });

    it('同じページで set が再び呼ばれても、詳しい題名を残す', () => {
        pageMeta.set({ title: '運用表' });
        pageMeta.setTitle('運用表（X）');
        pageMeta.set({ title: '運用表' });

        expect(TestBed.inject(DOCUMENT).title).toBe(
            '運用表（X） - Sotetsu Lab. v3',
        );
        expect(meta('property="og:title"')).toBe(
            '運用表（X） - Sotetsu Lab. v3',
        );
    });

    it('別のページの set では詳しい題名を捨てる', () => {
        pageMeta.set({ title: '運用表' });
        pageMeta.setTitle('運用表（X）');
        pageMeta.set({ title: '駅別時刻表' });

        expect(TestBed.inject(DOCUMENT).title).toBe(
            '駅別時刻表 - Sotetsu Lab. v3',
        );

        pageMeta.set({ title: '運用表' });

        expect(TestBed.inject(DOCUMENT).title).toBe('運用表 - Sotetsu Lab. v3');
        expect(meta('property="og:title"')).toBe('運用表 - Sotetsu Lab. v3');
    });
});
