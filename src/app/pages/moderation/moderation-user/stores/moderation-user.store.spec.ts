import { TestBed } from '@angular/core/testing';
import { OperationSightingSummaryDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-summary.dto';
import { ModerationUserStore } from './moderation-user.store';

function row(
    id: string,
    overrides: Partial<OperationSightingSummaryDto> = {},
): OperationSightingSummaryDto {
    return {
        operationSightingId: id,
        sightingTime: '2026-11-02T10:00:00.000Z',
        createdAt: '2026-11-02T10:00:00.000Z',
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        ...overrides,
    };
}

describe('ModerationUserStore', () => {
    let store: InstanceType<typeof ModerationUserStore>;

    beforeEach(() => {
        store = TestBed.inject(ModerationUserStore);
    });

    it('beginUser は前の人の中身を捨て、投稿者の id を入れる', () => {
        store.beginUser('u1');
        store.replaceSightings([row('s1')], true);
        store.setTraces([]);

        store.beginUser('u2');

        expect(store.userId()).toBe('u2');
        expect(store.sightings()).toEqual([]);
        expect(store.summary()).toBeNull();
        expect(store.traces()).toBeNull();
        expect(store.hasFetched()).toBe(false);
        expect(store.selectedIds()).toEqual([]);
    });

    it('beginUser より前に始めた取得は古い扱いになる', () => {
        store.beginUser('u1');
        const sightSeq = store.nextSightingsSeq();
        const traceSeq = store.nextTracesSeq();

        store.beginUser('u2');

        expect(store.isLatestSightings(sightSeq)).toBe(false);
        expect(store.isLatestTraces(traceSeq)).toBe(false);
    });

    it('まだ有効なものを全部選ぶと、無効の行は選ばれない', () => {
        store.beginUser('u1');
        store.replaceSightings(
            [row('s1'), row('s2', { invalidated: true })],
            false,
        );

        store.selectAllValid();

        expect(store.selectedIds()).toEqual(['s1']);
        expect(store.allValidSelected()).toBe(true);
        expect(store.selectedCount()).toBe(1);
    });

    it('選び直しで一覧を取り直すと、選びは空になる', () => {
        store.beginUser('u1');
        store.replaceSightings([row('s1')], false);
        store.selectAllValid();

        store.replaceSightings([row('s1')], false);

        expect(store.selectedIds()).toEqual([]);
    });

    it('一行ずつ選び・外せる', () => {
        store.beginUser('u1');
        store.replaceSightings([row('s1'), row('s2')], false);

        store.toggleSelected('s1', true);
        store.toggleSelected('s2', true);
        store.toggleSelected('s1', false);

        expect(store.selectedIds()).toEqual(['s2']);
    });
});
