/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 絞り込み・切り替え・タブの群と、スクロールする領域に、読み上げ用の名前が付いていることを
 * テンプレートから確かめる（fable-a11y 中4・中6・低11）。
 */
function template(path: string): string {
    return readFileSync(join(__dirname, path), 'utf8');
}

/** 開きタグ（`<tag` から `>` まで）を全部返す。属性値の中の `>` は無いものとして読む。 */
function openTags(html: string, tag: string): string[] {
    return Array.from(html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g')), (m) =>
        m[0].replace(/\s+/g, ' '),
    );
}

const CHIPS: [string, string[]][] = [
    [
        'pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/timetable-all-line-route-filter.component.html',
        ['路線で絞り込み'],
    ],
    [
        'pages/timetable/timetable-edit-form/components/timetable-edit-form-trips/timetable-edit-form-trips.component.html',
        ['路線で絞り込み'],
    ],
    [
        'pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component.html',
        ['路線で絞り込み'],
    ],
    [
        'pages/operation/operation-real-time/components/operation-real-time-filter/operation-real-time-filter.component.html',
        ['会社で絞り込み', '運用群で絞り込み'],
    ],
    [
        'pages/operation/operation-past-time/components/operation-past-time-filter/operation-past-time-filter.component.html',
        ['会社で絞り込み'],
    ],
    [
        'pages/operation/operation-table/components/operation-table-filter/operation-table-filter.component.html',
        ['運用群で絞り込み'],
    ],
    [
        'pages/train-diagram/components/train-diagram-controller/train-diagram-controller.component.html',
        ['路線で絞り込み'],
    ],
    [
        'pages/train-location/components/train-location-controller/train-location-controller.component.html',
        ['路線で絞り込み'],
    ],
];

const SEGMENTS: [string, string[]][] = [
    [
        'shared/operation-post-card/operation-post-form.component.html',
        ['目撃時刻の指定'],
    ],
    ['shared/train-picker/train-picker.component.html', ['方向']],
    [
        'shared/sticky-direction-toggle/sticky-direction-toggle.component.ts',
        ['方向'],
    ],
    ['shared/timetable-post-card/timetable-post-card.component.html', ['方向']],
    [
        'shared/timetable-search-card/timetable-search-card.component.html',
        ['方向'],
    ],
    [
        'pages/train-diagram/components/train-diagram-controller/train-diagram-controller.component.html',
        ['方向'],
    ],
    [
        'pages/train-location/components/train-location-controller/train-location-controller.component.html',
        ['表示する時刻'],
    ],
];

describe('群の名前（読み上げ）', () => {
    it.each(CHIPS)(
        'app-filter-chips に ariaLabel がある: %s',
        (path, names) => {
            const labels = openTags(template(path), 'app-filter-chips').map(
                (tag) => tag.match(/\sariaLabel="([^"]+)"/)?.[1],
            );
            expect(labels).toEqual(names);
        },
    );

    it.each(SEGMENTS)(
        'app-segment-toggle に ariaLabel がある: %s',
        (path, names) => {
            const tags = openTags(template(path), 'app-segment-toggle');
            expect(
                tags.map((tag) => tag.match(/\sariaLabel="([^"]+)"/)?.[1]),
            ).toEqual(names);
            // ホストの aria-label は入力に移した（名前のない div に付けない）
            expect(tags.some((tag) => /\saria-label=/.test(tag))).toBe(false);
        },
    );

    it('リアルタイムのスマホのタブ帯に「並び順」の名前がある', () => {
        const [tag] = openTags(
            template(
                'pages/operation/operation-real-time/operation-real-time.component.html',
            ),
            'mat-tab-group',
        );
        expect(tag).toContain('[aria-label]="\'並び順\'"');
    });

    it('ダイヤグラムのスクロール領域が tabindex 0・region・名前を持つ', () => {
        const [tag] = openTags(
            template(
                'pages/train-diagram/components/train-diagram-chart/train-diagram-chart.component.html',
            ),
            'div',
        );
        expect(tag).toContain('data-scroll-host');
        expect(tag).toContain('tabindex="0"');
        expect(tag).toContain('role="region"');
        expect(tag).toContain('aria-label="ダイヤグラム"');
    });
});
