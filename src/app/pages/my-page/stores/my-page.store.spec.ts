import { TestBed } from '@angular/core/testing';
import { MyOperationSightingDto } from 'src/app/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto';
import { MyPageStore } from './my-page.store';

function row(
    id: string,
    overrides: Partial<MyOperationSightingDto> = {},
): MyOperationSightingDto {
    return {
        operationSightingId: id,
        sightingTime: '2026-11-02T10:00:00.000Z',
        createdAt: '2026-11-02T10:00:00.000Z',
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        corroboration: 'uncorroborated',
        ...overrides,
    };
}

describe('MyPageStore', () => {
    let store: InstanceType<typeof MyPageStore>;

    beforeEach(() => {
        store = TestBed.inject(MyPageStore);
    });

    it('appendSightings は同じ id を二重に入れない', () => {
        store.replaceSightings([row('s1'), row('s2')], true);

        store.appendSightings([row('s2'), row('s3')], false);

        expect(store.sightings().map((r) => r.operationSightingId)).toEqual([
            's1',
            's2',
            's3',
        ]);
        expect(store.hasMore()).toBe(false);
    });

    it('古い世代の取得結果を捨てる', () => {
        const first = store.nextFetchSeq();
        const second = store.nextFetchSeq();

        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });

    it('begin は前の中身を捨て、始める前の取得を古い扱いにする', () => {
        const seq = store.nextFetchSeq();
        store.replaceSightings([row('s1')], true);
        store.setFirstFetchFailed(true);

        store.begin();

        expect(store.sightings()).toEqual([]);
        expect(store.summary()).toBeNull();
        expect(store.hasFetched()).toBe(false);
        expect(store.firstFetchFailed()).toBe(false);
        expect(store.isLatestFetch(seq)).toBe(false);
    });

    it('読み込み中の印は積んだ数だけ外れる', () => {
        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.disableLoading();
        expect(store.isLoading()).toBe(false);
    });
});
