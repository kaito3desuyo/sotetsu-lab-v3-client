/// <reference types="node" />
import { Generator } from '@angular/service-worker/config';
import { readFileSync } from 'fs';
import { join } from 'path';

interface DataGroup {
    name: string;
    urls: string[];
    cacheConfig: {
        strategy: string;
        timeout: string;
        maxAge: string;
        maxSize: number;
    };
}

interface AssetGroup {
    name: string;
    resources: { files: string[] };
}

interface NgswConfig {
    index: string;
    assetGroups: AssetGroup[];
    dataGroups: DataGroup[];
}

interface ManifestDataGroup {
    name: string;
    patterns: string[];
}

const config: NgswConfig = JSON.parse(
    readFileSync(join(__dirname, '..', 'ngsw-config.json'), 'utf-8'),
);

const API = 'https://api.sotetsu-lab.com';

/**
 * ngsw.json の生成（Generator）と同じ規則で dataGroups を変換し、
 * ngsw-worker.js の照合（先に書いた組から順に、パターンのどれかが URL に当たれば採用）で組を選ぶ。
 * 当たる組が無ければ null（worker は素通しでネットワークへ送る）。
 */
const generateDataGroups = async (): Promise<ManifestDataGroup[]> => {
    const generator = new Generator(
        { list: async () => [], hash: async () => '' } as never,
        '/',
    );
    const manifest = await generator.process({
        index: '/index.html',
        dataGroups: config.dataGroups,
    } as never);
    return (manifest as { dataGroups: ManifestDataGroup[] }).dataGroups;
};

const matchGroup = (groups: ManifestDataGroup[], url: string): string | null =>
    groups.find((group) =>
        group.patterns.some((pattern) => new RegExp(pattern).test(url)),
    )?.name ?? null;

describe('ngsw-config.json の殻（SSR ビルドの出力に合わせる）', () => {
    it('index は /index.csr.html（SSR ビルドは index.html を出さない）', () => {
        expect(config.index).toBe('/index.csr.html');
    });

    it('app の資源の files に /index.csr.html があり、/index.html は無い', () => {
        const app = config.assetGroups.find((group) => group.name === 'app')!;
        expect(app.resources.files).toContain('/index.csr.html');
        expect(app.resources.files).not.toContain('/index.html');
    });
});

describe('ngsw-config.json の dataGroups', () => {
    it('dataGroups は api-data と api の 2 組（目撃と現在位置の組は無い）', () => {
        expect(config.dataGroups.map((group) => group.name)).toEqual([
            'api-data',
            'api',
        ]);
    });

    it('api-data は目撃と現在位置を除く v3 のデータの API（freshness・3s・7d・50）', () => {
        const apiData = config.dataGroups[0];
        expect(apiData.cacheConfig).toEqual({
            strategy: 'freshness',
            timeout: '3s',
            maxAge: '7d',
            maxSize: 50,
        });
        // dataGroups の urls は否定（!）を解釈しないので、除外は「列挙」で行う。
        expect(apiData.urls.every((url) => !url.startsWith('!'))).toBe(true);
        expect(apiData.urls).not.toContain(`${API}/v3/**`);
    });

    it('dataGroups[1] は今の api（/api/**）のまま', () => {
        expect(config.dataGroups[1]).toEqual({
            name: 'api',
            urls: ['/api/**'],
            cacheConfig: {
                maxSize: 10,
                maxAge: '1d',
                timeout: '10s',
                strategy: 'freshness',
            },
        });
    });
});

describe('ngsw.json と同じ規則での照合', () => {
    const passThroughUrls = [
        `${API}/v3/operation-sightings/from/2026-10-27/to/2026-10-27`,
        `${API}/v3/operation-sightings/from/2026-10-27/to/2026-10-27?fields=a,b`,
        `${API}/v3/operation-sightings/time-cross-section/2026-10-27T10:00:00`,
        `${API}/v3/operation-sightings/time-cross-section/operation-number/1001`,
        `${API}/v3/operation-sightings/time-cross-section/formation-number/10001`,
        `${API}/v3/operations/current-positions`,
        `${API}/v3/operations/current-positions?include=trip&fields=a`,
        `${API}/v3/operations/123/current-position`,
        `${API}/v3/operations/123/current-position?include=trip`,
    ];

    const cachedUrls = [
        `${API}/v3/feature-flags`,
        `${API}/v3/calendar-dates`,
        `${API}/v3/calendars/as/of/2026-10-27`,
        `${API}/v3/calendars/5`,
        `${API}/v3/formations/as/of/2026-10-27`,
        `${API}/v3/formations/from/2026-10-01/to/2026-10-31`,
        `${API}/v3/services`,
        `${API}/v3/services/1/stations`,
        `${API}/v3/services/1/agencies`,
        `${API}/v3/services/1/routes`,
        `${API}/v3/agencies`,
        `${API}/v3/routes`,
        `${API}/v3/routes/1/stations`,
        `${API}/v3/stations`,
        `${API}/v3/trip-classes`,
        `${API}/v3/trip-blocks/5`,
        `${API}/v3/trip-blocks?calendarId=5&fields=a`,
        `${API}/v3/operations/calendar/5`,
        `${API}/v3/operations/calendar/5/trips`,
        `${API}/v3/operations/from/2026-10-01/to/2026-10-31`,
        `${API}/v3/operations/123/trips`,
        `${API}/v3/operations/groups`,
        `${API}/v3/operations/next-operation-candidates`,
        `${API}/v3/operations/itinerary-links`,
    ];

    it.each(passThroughUrls)(
        '目撃・現在位置の URL はどの組にも当たらず素通しになる: %s',
        async (url) => {
            expect(matchGroup(await generateDataGroups(), url)).toBeNull();
        },
    );

    it.each(cachedUrls)(
        '時刻表などの URL は api-data に当たる: %s',
        async (url) => {
            expect(matchGroup(await generateDataGroups(), url)).toBe(
                'api-data',
            );
        },
    );

    it('BFF（/api/**）は api に当たる', async () => {
        expect(
            matchGroup(
                await generateDataGroups(),
                'https://v3.sotetsu-lab.com/api/maintenance',
            ),
        ).toBe('api');
    });
});

describe('ngsw.json と同じ規則での assetGroups の照合', () => {
    // assetGroups の files は全体一致の glob（Generator が dist の一覧に当てて urls を作る）。
    // 「/assets」だけでは /assets/ 配下のアイコンや字体が保存の対象から外れる。
    const generateAssetsUrls = async (files: string[]): Promise<string[]> => {
        const generator = new Generator(
            { list: async () => files, hash: async () => '' } as never,
            '/',
        );
        const manifest = await generator.process({
            index: '/index.html',
            assetGroups: config.assetGroups,
        } as never);
        return (
            manifest as { assetGroups: { name: string; urls: string[] }[] }
        ).assetGroups.find((group) => group.name === 'assets')!.urls;
    };

    it.each(['/assets/fonts/x.woff2', '/assets/icons/x.png'])(
        '/assets/ 配下のファイルは assets の組の urls に入る: %s',
        async (file) => {
            expect(await generateAssetsUrls([file])).toContain(file);
        },
    );
});
