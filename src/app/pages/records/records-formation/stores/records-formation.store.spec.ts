import { TestBed } from '@angular/core/testing';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { RecordsFormationStore } from './records-formation.store';

const sighting = (
    id: string,
    sightingTime: string,
    extra: Partial<OperationSightingDetailsDto> = {},
): OperationSightingDetailsDto =>
    ({
        operationSightingId: id,
        formationId: 'f1',
        operationId: `op-${id}`,
        sightingTime,
        ...extra,
    }) as OperationSightingDetailsDto;

describe('RecordsFormationStore', () => {
    it('目撃を鉄道日（4 時区切り）ごとに分け、無効化されたものは除く', () => {
        const store = TestBed.inject(RecordsFormationStore);
        store.setSightings([
            sighting('a', '2026-11-10T20:00:00Z'), // 日本時間 11/11 05:00 → 11/11
            sighting('b', '2026-11-10T18:00:00Z'), // 日本時間 11/11 03:00 → 11/10
            sighting('c', '2026-11-10T21:00:00Z', {
                invalidation: {} as never,
            }),
            sighting('d', '2026-11-11T01:00:00Z'),
        ]);
        const byDate = store.sightingsByDate();
        expect(Object.keys(byDate).sort()).toEqual([
            '2026-11-10',
            '2026-11-11',
        ]);
        expect(byDate['2026-11-11'].map((s) => s.operationSightingId)).toEqual([
            'a',
            'd',
        ]);
    });

    it('取得の世代は新しい番号だけが最新になる', () => {
        const store = TestBed.inject(RecordsFormationStore);
        const first = store.nextFetchSeq();
        const second = store.nextFetchSeq();
        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });

    it('月を始めると前の月の目撃を捨てる', () => {
        const store = TestBed.inject(RecordsFormationStore);
        store.setSightings([sighting('a', '2026-11-10T20:00:00Z')]);
        store.setLoaded(true);
        store.startMonth({ formationNumber: '10701', month: '2026-10' });
        expect(store.sightings()).toEqual([]);
        expect(store.loaded()).toBe(false);
        expect(store.month()).toBe('2026-10');
    });
});
