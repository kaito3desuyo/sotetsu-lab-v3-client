import { TestBed } from '@angular/core/testing';
import { ModerationRecentSightingDto } from 'src/app/libs/moderation/usecase/dtos/moderation-recent-sighting.dto';
import { ModerationRecentStore } from './moderation-recent.store';

function row(id: string): ModerationRecentSightingDto {
    return {
        operationSightingId: id,
        sightingTime: '2026-11-02T10:00:00.000Z',
        createdAt: '2026-11-02T10:00:00.000Z',
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        author: null,
    };
}

describe('ModerationRecentStore', () => {
    let store: InstanceType<typeof ModerationRecentStore>;

    beforeEach(() => {
        store = TestBed.inject(ModerationRecentStore);
    });

    it('replaceSightings は中身を入れ替え、取得済みにする', () => {
        store.appendSightings([row('a')], false);
        store.replaceSightings([row('b')], true);

        expect(store.sightings().map((r) => r.operationSightingId)).toEqual([
            'b',
        ]);
        expect(store.hasMore()).toBe(true);
        expect(store.hasFetched()).toBe(true);
    });

    it('appendSightings は後ろに足し、すでにある id は足さない', () => {
        store.replaceSightings([row('a'), row('b')], true);
        store.appendSightings([row('b'), row('c')], false);

        expect(store.sightings().map((r) => r.operationSightingId)).toEqual([
            'a',
            'b',
            'c',
        ]);
        expect(store.hasMore()).toBe(false);
    });

    it('読み込み中の印は enable / disable で増減する', () => {
        store.enableLoading();
        expect(store.isLoading()).toBe(true);
        store.disableLoading();
        expect(store.isLoading()).toBe(false);
    });
});
