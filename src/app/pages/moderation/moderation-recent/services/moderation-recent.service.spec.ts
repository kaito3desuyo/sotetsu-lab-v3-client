import { TestBed } from '@angular/core/testing';
import { lastValueFrom, of } from 'rxjs';
import { ModerationRecentSightingDto } from 'src/app/libs/moderation/usecase/dtos/moderation-recent-sighting.dto';
import { ModerationService } from 'src/app/libs/moderation/usecase/moderation.service';
import { ModerationRecentStore } from '../stores/moderation-recent.store';
import {
    MODERATION_RECENT_PAGE_SIZE,
    ModerationRecentService,
} from './moderation-recent.service';

function rows(count: number, from = 0): ModerationRecentSightingDto[] {
    return Array.from({ length: count }, (_, i) => ({
        operationSightingId: `s${from + i}`,
        sightingTime: '2026-11-02T10:00:00.000Z',
        createdAt: `2026-11-02T10:00:00.${String(999 - (from + i)).padStart(3, '0')}Z`,
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        author: null,
    }));
}

describe('ModerationRecentService', () => {
    let service: ModerationRecentService;
    let store: InstanceType<typeof ModerationRecentStore>;
    let getRecentSightings: jest.Mock;

    beforeEach(() => {
        getRecentSightings = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                ModerationRecentService,
                {
                    provide: ModerationService,
                    useValue: { getRecentSightings },
                },
            ],
        });
        service = TestBed.inject(ModerationRecentService);
        store = TestBed.inject(ModerationRecentStore);
    });

    it('最初の取得は 100 件を頼み、満ちていれば hasMore にする', async () => {
        getRecentSightings.mockReturnValue(of(rows(100)));

        await lastValueFrom(service.fetchFirstPage());

        expect(MODERATION_RECENT_PAGE_SIZE).toBe(100);
        expect(getRecentSightings).toHaveBeenCalledWith({ limit: 100 });
        expect(store.sightings()).toHaveLength(100);
        expect(store.hasMore()).toBe(true);
    });

    it('100 件に満たなければ hasMore は false', async () => {
        getRecentSightings.mockReturnValue(of(rows(30)));

        await lastValueFrom(service.fetchFirstPage());

        expect(store.hasMore()).toBe(false);
    });

    it('次の取得は最後の行の createdAt を before にして取り足す', async () => {
        getRecentSightings.mockReturnValueOnce(of(rows(100)));
        await lastValueFrom(service.fetchFirstPage());
        getRecentSightings.mockReturnValueOnce(of(rows(5, 100)));

        await lastValueFrom(service.fetchNextPage());

        expect(getRecentSightings).toHaveBeenLastCalledWith({
            limit: 100,
            before: rows(100)[99].createdAt,
        });
        expect(store.sightings()).toHaveLength(105);
        expect(store.hasMore()).toBe(false);
    });
});
