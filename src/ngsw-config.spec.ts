/// <reference types="node" />
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

interface NgswConfig {
    dataGroups: DataGroup[];
}

const config: NgswConfig = JSON.parse(
    readFileSync(join(__dirname, '..', 'ngsw-config.json'), 'utf-8'),
);

describe('ngsw-config.json の dataGroups', () => {
    it('dataGroups[0] は圏外で使う目撃と現在位置の組', () => {
        expect(config.dataGroups[0]).toEqual({
            name: 'api-sightings',
            urls: [
                'https://api.sotetsu-lab.com/v3/operation-sightings/**',
                'https://api.sotetsu-lab.com/v3/operations/current-positions',
            ],
            cacheConfig: {
                strategy: 'freshness',
                timeout: '10s',
                maxAge: '1d',
                maxSize: 50,
            },
        });
    });

    it('dataGroups[1] は v3 の残り全部（データの API）', () => {
        expect(config.dataGroups[1]).toEqual({
            name: 'api-data',
            urls: ['https://api.sotetsu-lab.com/v3/**'],
            cacheConfig: {
                strategy: 'freshness',
                timeout: '3s',
                maxAge: '7d',
                maxSize: 50,
            },
        });
    });

    it('dataGroups[2] は今の api（/api/**）のまま', () => {
        expect(config.dataGroups[2]).toEqual({
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
