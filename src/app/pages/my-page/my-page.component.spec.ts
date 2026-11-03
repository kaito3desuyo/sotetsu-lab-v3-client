import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { MyOperationSightingDto } from 'src/app/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { MySummaryDto } from 'src/app/libs/user/usecase/dtos/my-summary.dto';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { MyPageComponent } from './my-page.component';
import { MY_PAGE_SIZE, MyPageService } from './services/my-page.service';

function mySummary(overrides: Partial<MySummaryDto> = {}): MySummaryDto {
    return {
        sightingCount: 14,
        invalidatedCount: 1,
        firstSightingAt: '2026-10-25T01:15:00.000Z',
        lastSightingAt: '2026-11-02T04:05:00.000Z',
        corroboration: {
            corroborated: 7,
            conflicting: 2,
            uncorroborated: 4,
            invalidated: 1,
        },
        ...overrides,
    };
}

function sighting(
    id: string,
    overrides: Partial<MyOperationSightingDto> = {},
): MyOperationSightingDto {
    return {
        operationSightingId: id,
        sightingTime: '2026-11-02T10:00:00.000Z',
        createdAt: '2026-11-02T10:00:05.000Z',
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        corroboration: 'uncorroborated',
        ...overrides,
    };
}

describe('MyPageComponent', () => {
    let fixture: ComponentFixture<MyPageComponent>;
    let userApi: { findMySummary: jest.Mock };
    let sightingApi: { findManyMine: jest.Mock };
    let notificationOpen: jest.Mock;

    async function render(
        options: {
            summary?: MySummaryDto;
            sightings?: MyOperationSightingDto[];
            summaryError?: boolean;
        } = {},
    ) {
        userApi = {
            findMySummary: jest
                .fn()
                .mockReturnValue(
                    options.summaryError
                        ? throwError(() => new Error('fail'))
                        : of(options.summary ?? mySummary()),
                ),
        };
        sightingApi = {
            findManyMine: jest
                .fn()
                .mockReturnValue(of(options.sightings ?? [sighting('s1')])),
        };
        notificationOpen = jest.fn();
        await TestBed.configureTestingModule({
            imports: [MyPageComponent],
            providers: [
                provideRouter([]),
                MyPageService,
                { provide: UserService, useValue: userApi },
                { provide: OperationSightingService, useValue: sightingApi },
                {
                    provide: NotificationService,
                    useValue: { open: notificationOpen },
                },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(MyPageComponent);
        await settle();
    }

    async function settle() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function el(): HTMLElement {
        return fixture.nativeElement as HTMLElement;
    }

    function byId(id: string): HTMLElement | null {
        return el().querySelector(`[data-testid="${id}"]`);
    }

    it('要約の 4 つの内訳と注記を出す', async () => {
        await render();

        const text = byId('my-page-summary').textContent;
        expect(text).toContain('14');
        expect(byId('summary-corroborated')).toHaveTextContent('裏付けあり');
        expect(byId('summary-corroborated')).toHaveTextContent('7');
        expect(byId('summary-conflicting')).toHaveTextContent(
            '別の運用の目撃あり',
        );
        expect(byId('summary-conflicting')).toHaveTextContent('2');
        expect(byId('summary-uncorroborated')).toHaveTextContent(
            '他の目撃なし',
        );
        expect(byId('summary-uncorroborated')).toHaveTextContent('4');
        expect(byId('summary-invalidated')).toHaveTextContent('無効');
        expect(byId('summary-invalidated')).toHaveTextContent('1');
        expect(text).toContain('10/25');
        expect(text).toContain('11/2');
        expect(text).toContain(
            'ログインして出した目撃だけを数えます（記録は 2026年10月24日から）。裏付けは、同じ日に他の人が同じ編成を同じ運用で見たかどうかです。',
        );
    });

    it('裏付けの値ごとに決めた言葉を出す', async () => {
        await render({
            sightings: [
                sighting('a', { corroboration: 'corroborated' }),
                sighting('b', { corroboration: 'conflicting' }),
                sighting('c', { corroboration: 'uncorroborated' }),
                sighting('d', {
                    corroboration: 'invalidated',
                    invalidated: true,
                }),
            ],
        });

        const label = (id: string) =>
            byId(`corroboration-${id}`).textContent.trim();
        expect(label('a')).toBe('裏付けあり');
        expect(label('b')).toBe('別の運用の目撃あり');
        expect(label('c')).toBe('他の目撃なし');
        expect(label('d')).toBe('無効');
        expect(byId('corroboration-a')).toHaveClass('tw-text-corroborated');
        expect(byId('corroboration-b')).not.toHaveClass('tw-text-corroborated');
        expect(byId('corroboration-b')).not.toHaveClass('tw-text-muted');
        expect(byId('corroboration-c')).toHaveClass('tw-text-muted');
        expect(byId('corroboration-d')).toHaveClass('tw-text-muted');
        expect(byId('corroboration-d')).not.toHaveClass('tw-line-through');
    });

    it('一覧に日時・運用番号・編成番号を出す', async () => {
        await render({
            sightings: [
                sighting('a', {
                    sightingTime: '2026-11-02T10:00:05.000Z',
                    operationNumber: '12K',
                    formationNumber: '9703',
                }),
            ],
        });

        const row = byId('my-page-row-a');
        expect(row).toHaveTextContent('11/2 19:00:05');
        expect(row).toHaveTextContent('12K');
        expect(row).toHaveTextContent('9703');
    });

    it('0 件なら「まだ投稿がありません」とリアルタイムへのリンク', async () => {
        await render({
            summary: mySummary({
                sightingCount: 0,
                invalidatedCount: 0,
                firstSightingAt: null,
                lastSightingAt: null,
                corroboration: {
                    corroborated: 0,
                    conflicting: 0,
                    uncorroborated: 0,
                    invalidated: 0,
                },
            }),
            sightings: [],
        });

        expect(el()).toHaveTextContent('まだ投稿がありません');
        const link = el().querySelector('a[href="/operation/real-time"]');
        expect(link).toHaveTextContent('リアルタイム運用情報');
        expect(el()).not.toHaveTextContent('もっと見る');
    });

    it('もっと見るで最後の createdAt を before に渡す', async () => {
        const page = Array.from({ length: MY_PAGE_SIZE }, (_, i) =>
            sighting(`s${i}`, {
                createdAt: new Date(
                    Date.UTC(2026, 10, 2, 10, 0, 0) - i * 1000,
                ).toISOString(),
            }),
        );
        await render({ sightings: page });
        const last = page[page.length - 1].createdAt;
        sightingApi.findManyMine.mockReturnValue(of([sighting('older')]));

        const button = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent.includes('もっと見る'),
        );
        button.click();
        await settle();

        expect(sightingApi.findManyMine).toHaveBeenLastCalledWith({
            limit: MY_PAGE_SIZE,
            before: last,
        });
        expect(byId('my-page-row-older')).not.toBeNull();
        expect(el()).not.toHaveTextContent('もっと見る');
    });

    it('大見出し（h1/h2 のページ名）を置かない', async () => {
        await render();

        expect(el().querySelector('h1')).toBeNull();
        expect(el().querySelector('h2')).toBeNull();
    });

    it('順位・正答率・比較の言葉を出さない', async () => {
        await render();

        const text = el().textContent;
        expect(text).not.toMatch(/順位|正答率|ランキング|平均|他の人と比/);
        expect(text).not.toContain('%');
    });

    it('最初の取得に失敗したら再読み込みを出し、押すと取り直す', async () => {
        await render({ summaryError: true });

        expect(notificationOpen).toHaveBeenCalled();
        expect(el()).toHaveTextContent('読み込めませんでした');
        expect(byId('my-page-summary')).toBeNull();

        userApi.findMySummary.mockReturnValue(of(mySummary()));
        const button = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent.includes('再読み込み'),
        );
        button.click();
        await settle();

        expect(byId('my-page-summary')).not.toBeNull();
    });
});
