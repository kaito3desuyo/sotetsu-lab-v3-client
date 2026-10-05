import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrainLocationCard } from '../../interfaces/train-location-card.interface';
import { TrainLocationCardComponent } from './train-location-card.component';

function card(overrides: Partial<TrainLocationCard> = {}): TrainLocationCard {
    return {
        tripId: 't1',
        tripNumber: '1234',
        tripClassName: '各停',
        tripClassColor: '#8a8a8a',
        destinationName: '横浜',
        direction: 'inbound',
        detailLink: ['/timetable', 'all-line', {}],
        ...overrides,
    };
}

describe('TrainLocationCardComponent', () => {
    let component: TrainLocationCardComponent;
    let fixture: ComponentFixture<TrainLocationCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationCardComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainLocationCardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.componentRef.setInput('card', card());
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('status="stopped" のとき「停車中」を表示し、進行方向矢印は表示しない（モック09準拠）', () => {
        fixture.componentRef.setInput('card', card());
        fixture.componentRef.setInput('status', 'stopped');
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(/停車中/);
        expect(fixture.nativeElement).not.toHaveTextContent(/▲/);
        expect(fixture.nativeElement).not.toHaveTextContent(/▼/);
    });

    it('2段構成（モック09準拠）: 上段に種別・行き先・運用番号、下段に列車番号・矢印・所属会社・編成番号を表示する', () => {
        fixture.componentRef.setInput(
            'card',
            card({
                operationNumber: '54',
                formationNumber: '10708',
                formationAgencyName: '相模鉄道',
            }),
        );
        fixture.detectChanges();

        const rows: HTMLElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('[data-card] > span'),
        );
        expect(rows.length).toBe(2);

        const [top, bottom] = rows;
        expect(top).toHaveTextContent(/各停/);
        expect(top).toHaveTextContent(/横浜 行/);
        expect(top).toHaveTextContent(/54/);
        expect(top).not.toHaveTextContent(/1234/);

        expect(bottom).toHaveTextContent(/1234/);
        expect(bottom).toHaveTextContent(/▲/);
        expect(bottom).toHaveTextContent(/相模鉄道/);
        expect(bottom).toHaveTextContent(/10708/);
    });

    it('formationAgencyName が無ければ会社名なしで編成番号のみ表示する', () => {
        fixture.componentRef.setInput(
            'card',
            card({ formationNumber: '9999', formationAgencyName: undefined }),
        );
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(/9999/);
        expect(fixture.nativeElement).not.toHaveTextContent(/相模鉄道/);
    });

    it('運用番号の地を運用群の色にする（5 で始まる運用は青の淡色）', () => {
        fixture.componentRef.setInput('card', card({ operationNumber: '54' }));
        fixture.detectChanges();

        const tag = fixture.nativeElement.querySelector(
            '[data-operation-number]',
        ) as HTMLElement;
        expect(tag.textContent?.trim()).toBe('54');
        expect(fixture.nativeElement).not.toHaveTextContent(/運用/);
        expect(tag).toHaveStyle({
            backgroundColor: 'rgba(33, 150, 243, 0.12)',
        });
    });

    it('status="between" かつ direction="inbound" のとき ▲ を表示する', () => {
        fixture.componentRef.setInput('card', card({ direction: 'inbound' }));
        fixture.componentRef.setInput('status', 'between');
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(/▲/);
    });

    it('status="between" かつ direction="outbound" のとき ▼ を表示する', () => {
        fixture.componentRef.setInput('card', card({ direction: 'outbound' }));
        fixture.componentRef.setInput('status', 'between');
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(/▼/);
    });

    it('formationNumber が無ければ充当編成表示欄を出さない', () => {
        fixture.componentRef.setInput(
            'card',
            card({ formationNumber: undefined }),
        );
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector(
                'span.tw-truncate.tw-font-bold.tw-text-grey-900',
            ),
        ).toBeNull();
    });

    it('formationNumber があれば無加工の値をそのまま表示する', () => {
        fixture.componentRef.setInput(
            'card',
            card({ formationNumber: '9999' }),
        );
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(/9999/);
        expect(
            fixture.nativeElement.querySelector(
                'span.tw-truncate.tw-font-bold.tw-text-grey-900',
            ),
        ).not.toBeNull();
    });

    it('幅が固定でも列の幅を超えない（tw-max-w-full）', () => {
        fixture.componentRef.setInput('card', card());
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector(
            '[data-card]',
        ) as HTMLElement;
        expect(link.className).toContain('tw-w-40');
        expect(link.className).toContain('tw-max-w-full');
        // 実測（390x844）: align-items:flex-end の列では、ホスト自身が max-w-full を
        // 持たないと祖先の幅制約が <a> まで伝わらず、はみ出す（box-sizing:content-box
        // かつ preflight 無効のため）。ホストにも max-w-full を付けて経路を切らない。
        expect((fixture.nativeElement as HTMLElement).className).toContain(
            'tw-max-w-full',
        );
    });

    it('影ではなく細い縁で面を分ける（面の掟）', () => {
        fixture.componentRef.setInput('card', card());
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector(
            '[data-card]',
        ) as HTMLElement;
        expect(link.className).not.toContain('tw-shadow');
        expect(link.className).toContain('tw-border-solid');
    });

    it('カードの面は全線時刻表へのリンク（面全体を覆う）', () => {
        fixture.componentRef.setInput(
            'card',
            card({
                detailLink: [
                    '/timetable',
                    'all-line',
                    { trip_block_id: 'tb-1' },
                ],
            }),
        );
        fixture.detectChanges();

        const cover = fixture.nativeElement.querySelector(
            'a[data-card-link]',
        ) as HTMLAnchorElement;
        expect(cover).toHaveAttribute(
            'href',
            expect.stringContaining('/timetable/all-line'),
        );
        expect(cover.className).toContain('tw-absolute');
        expect(cover.className).toContain('tw-inset-0');
    });

    it('運用番号は運用行路図へのリンク（カードの面のリンクより上に重ねる）', () => {
        fixture.componentRef.setInput(
            'card',
            card({ operationNumber: '54', operationId: 'op-1' }),
        );
        fixture.detectChanges();

        const tag = fixture.nativeElement.querySelector(
            'a[data-operation-number]',
        ) as HTMLAnchorElement;
        expect(tag).toHaveAttribute(
            'href',
            '/operation/route-diagram;operation_id=op-1',
        );
        expect(tag.className).toContain('tw-relative');
        // リンクの中にリンクを入れない
        expect(tag.closest('a[data-card-link]')).toBeNull();
    });

    it('運用 ID が無ければ運用番号はリンクにしない', () => {
        fixture.componentRef.setInput('card', card({ operationNumber: '54' }));
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('a[data-operation-number]'),
        ).toBeNull();
        expect(
            fixture.nativeElement.querySelector('span[data-operation-number]'),
        ).not.toBeNull();
    });
});
