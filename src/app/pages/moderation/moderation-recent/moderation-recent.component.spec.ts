import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OperationSightingRecentDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-recent.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ModerationRecentComponent } from './moderation-recent.component';
import { ModerationRecentService } from './services/moderation-recent.service';

type Author = NonNullable<OperationSightingRecentDto['author']>;

function sighting(
    id: string,
    overrides: Partial<OperationSightingRecentDto> = {},
): OperationSightingRecentDto {
    return {
        operationSightingId: id,
        sightingTime: '2026-11-02T10:00:00.000Z',
        createdAt: '2026-11-02T10:00:05.000Z',
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        author: null,
        ...overrides,
    };
}

function author(overrides: Partial<Author> = {}): Author {
    return {
        userId: 'u1',
        username: 'taro',
        displayName: '太郎',
        role: 'reporter',
        newAccount: false,
        burst: false,
        ...overrides,
    };
}

describe('ModerationRecentComponent', () => {
    let fixture: ComponentFixture<ModerationRecentComponent>;
    let findManyRecent: jest.Mock;
    let notificationOpen: jest.Mock;

    async function render(first: OperationSightingRecentDto[] | Error) {
        findManyRecent = jest
            .fn()
            .mockReturnValue(
                first instanceof Error ? throwError(() => first) : of(first),
            );
        notificationOpen = jest.fn();
        await TestBed.configureTestingModule({
            imports: [ModerationRecentComponent],
            providers: [
                provideRouter([]),
                ModerationRecentService,
                {
                    provide: OperationSightingService,
                    useValue: { findManyRecent },
                },
                {
                    provide: NotificationService,
                    useValue: { open: notificationOpen },
                },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ModerationRecentComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function el(): HTMLElement {
        return fixture.nativeElement as HTMLElement;
    }

    it('新しい順に 100 件を頼み、投稿時刻（日本時間）・運番・編成を出す', async () => {
        await render([sighting('s1')]);

        expect(findManyRecent).toHaveBeenCalledWith({ limit: 100 });
        const cells = el().querySelectorAll('tbody tr')[0].textContent;
        expect(cells).toContain('11/2 19:00:05');
        expect(cells).toContain('10A');
        expect(cells).toContain('12101');
    });

    it('投稿者の名前は投稿者のページへのリンクになる', async () => {
        await render([sighting('s1', { author: author() })]);

        const link = el().querySelector('a[href="/moderation/users/u1"]');
        expect(link).toHaveTextContent('taro');
    });

    it('ゲストの行は「ゲスト」と出し、名前はリンクでない', async () => {
        await render([sighting('s1', { author: null })]);

        const row = el().querySelectorAll('tbody tr')[0];
        expect(row).toHaveTextContent('ゲスト');
        expect(row.querySelector('a')).toBeNull();
    });

    it('newAccount と burst の印が出て、無ければ出ない', async () => {
        await render([
            sighting('s1', { author: author({ newAccount: true }) }),
            sighting('s2', { author: author({ burst: true }) }),
            sighting('s3', { author: author() }),
        ]);

        const rows = el().querySelectorAll('tbody tr');
        expect(rows[0]).toHaveTextContent('登録して間もない');
        expect(rows[0]).not.toHaveTextContent('短い時間に多い');
        expect(rows[1]).toHaveTextContent('短い時間に多い');
        expect(rows[1]).not.toHaveTextContent('登録して間もない');
        expect(rows[2]).not.toHaveTextContent('登録して間もない');
        expect(rows[2]).not.toHaveTextContent('短い時間に多い');
    });

    it('状態は有効／無効で、無効にした人の username を添える', async () => {
        await render([
            sighting('s1'),
            sighting('s2', {
                invalidated: true,
                invalidatedBy: { userId: 'u9', username: 'editor1' },
            }),
        ]);

        const rows = el().querySelectorAll('tbody tr');
        expect(rows[0]).toHaveTextContent('有効');
        expect(rows[1]).toHaveTextContent('無効');
        expect(rows[1]).toHaveTextContent('editor1');
    });

    it('100 件に満たなければ「もっと見る」は出さない', async () => {
        await render([sighting('s1')]);

        expect(el()).not.toHaveTextContent('もっと見る');
    });

    it('「もっと見る」は最後の行の createdAt を before にして取り足す', async () => {
        const page = Array.from({ length: 100 }, (_, i) =>
            sighting(`s${i}`, {
                createdAt: `2026-11-02T10:00:00.${String(999 - i).padStart(3, '0')}Z`,
            }),
        );
        await render(page);
        findManyRecent.mockReturnValue(
            of([sighting('older', { createdAt: '2026-11-01T00:00:00.000Z' })]),
        );

        const button = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent?.includes('もっと見る'),
        );
        button.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(findManyRecent).toHaveBeenLastCalledWith({
            limit: 100,
            before: page[99].createdAt,
        });
        expect(el().querySelectorAll('tbody tr')).toHaveLength(101);
        expect(el()).not.toHaveTextContent('もっと見る');
    });

    it('初回の取得に失敗したら骨組みを消して再読み込みを出し、押すと取り直して一覧を出す', async () => {
        await render(new Error('offline'));

        expect(
            el().querySelector('[data-testid="moderation-recent-skeleton"]'),
        ).toBeNull();
        expect(el()).toHaveTextContent('読み込めませんでした');
        expect(notificationOpen).toHaveBeenCalled();
        const retry = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent?.includes('再読み込み'),
        );

        findManyRecent.mockReturnValue(of([sighting('s1')]));
        retry.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(findManyRecent).toHaveBeenCalledTimes(2);
        expect(el()).not.toHaveTextContent('読み込めませんでした');
        expect(el().querySelectorAll('tbody tr')).toHaveLength(1);
    });
});
