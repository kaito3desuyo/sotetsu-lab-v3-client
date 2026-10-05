import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrainLocationCard } from '../../interfaces/train-location-card.interface';
import {
    TrainLocationRow,
    TrainLocationStationRow,
} from '../../interfaces/train-location-row.interface';
import {
    BETWEEN_ROW_BASE_HEIGHT_PX,
    BETWEEN_ROW_CARD_HEIGHT_PX,
} from '../../utils/resolve-between-row-layout.util';
import { TrainLocationLineComponent } from './train-location-line.component';

function card(tripId: string): TrainLocationCard {
    return {
        tripId,
        tripNumber: tripId,
        tripClassName: '各停',
        tripClassColor: '#8a8a8a',
        destinationName: '横浜',
        direction: 'inbound',
        detailLink: ['/timetable', 'all-line', {}],
    };
}

function stationRow(
    o: Partial<TrainLocationStationRow>,
): TrainLocationStationRow {
    return {
        kind: 'station',
        stationId: 's',
        stationName: '駅',
        isMajor: false,
        leftCards: [],
        rightCards: [],
        interchangeRoutes: [],
        ...o,
    };
}

describe('TrainLocationLineComponent', () => {
    let fixture: ComponentFixture<TrainLocationLineComponent>;
    let component: TrainLocationLineComponent;

    function setRows(rows: TrainLocationRow[]): void {
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();
    }

    function el(): HTMLElement {
        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationLineComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainLocationLineComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.componentRef.setInput('rows', []);
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('同じ駅・同じ向きに複数停車していても、吹き出しに畳まず全部のカードを並べる', () => {
        setRows([
            stationRow({
                stationId: 's1',
                leftCards: [card('a'), card('b'), card('c')],
            }),
        ]);

        expect(el().querySelectorAll('app-train-location-card')).toHaveLength(
            3,
        );
        expect(el()).not.toHaveTextContent(/本停車中/);
    });

    it('駅の札を押すと stationSelect に stationId を出す', () => {
        setRows([stationRow({ stationId: 's1', stationName: '二俣川' })]);
        const emitted: string[] = [];
        fixture.componentInstance.stationSelect.subscribe((id) =>
            emitted.push(id),
        );

        (
            el().querySelector(
                'button[data-station-id="s1"]',
            ) as HTMLButtonElement
        ).click();

        expect(emitted).toEqual(['s1']);
    });

    it('選択中の駅の札は aria-pressed="true"', () => {
        fixture.componentRef.setInput('selectedStationId', 's1');
        setRows([
            stationRow({ stationId: 's1' }),
            stationRow({ stationId: 's2' }),
        ]);

        expect(
            el()
                .querySelector('[data-station-id="s1"]')
                ?.getAttribute('aria-pressed'),
        ).toBe('true');
        expect(
            el()
                .querySelector('[data-station-id="s2"]')
                ?.getAttribute('aria-pressed'),
        ).toBe('false');
    });

    it('在線の無い駅間は 30px', () => {
        setRows([
            stationRow({ stationId: 's1' }),
            {
                kind: 'between',
                fromStationId: 's1',
                toStationId: 's2',
                leftCards: [],
                rightCards: [],
            },
            stationRow({ stationId: 's2' }),
        ]);

        const between = el().querySelector('[data-between]') as HTMLElement;
        expect(between).toHaveStyle({ height: '30px' });
    });

    it('乗換路線がある駅には他路線への routerLink チップを表示する（station_id 付き）', () => {
        const rows: TrainLocationRow[] = [
            stationRow({
                stationId: 'futamatagawa',
                stationName: '二俣川',
                isMajor: true,
                interchangeRoutes: [{ routeId: 'r-main', routeName: '本線' }],
            }),
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        const link: HTMLAnchorElement =
            fixture.nativeElement.querySelector('a');
        expect(link).toHaveTextContent(/本線/);
        expect(link).toHaveAttribute('href', expect.stringContaining('r-main'));
        expect(link).toHaveAttribute(
            'href',
            expect.stringContaining('station_id=futamatagawa'),
        );
    });

    it('乗換路線が無い駅にはチップを表示しない', () => {
        const rows: TrainLocationRow[] = [
            stationRow({
                stationId: 'ebina',
                stationName: '海老名',
                isMajor: false,
                interchangeRoutes: [],
            }),
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('a')).toBeNull();
    });

    it('between 行のカードは衝突回避レイアウト（resolveBetweenRowLayout）の px 位置を反映する', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'between',
                fromStationId: 'a',
                toStationId: 'b',
                leftCards: [{ card: card('t1'), topProgress: 0.4 }],
                rightCards: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        const positioned: HTMLElement = fixture.nativeElement.querySelector(
            'app-train-location-card',
        ).parentElement;
        const usableHeightPx =
            BETWEEN_ROW_BASE_HEIGHT_PX - BETWEEN_ROW_CARD_HEIGHT_PX;
        expect(positioned).toHaveStyle({ top: `${0.4 * usableHeightPx}px` });
    });

    it('98 G8: 同一区間・同一方向に近接進捗の複数在線があってもカードが重ならない（衝突回避）', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'between',
                fromStationId: 'a',
                toStationId: 'b',
                leftCards: [
                    { card: card('t1'), topProgress: 0.5 },
                    { card: card('t2'), topProgress: 0.5 },
                    { card: card('t3'), topProgress: 0.5 },
                ],
                rightCards: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        const positionedElements: HTMLElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('app-train-location-card'),
        ).map((el) => (el as HTMLElement).parentElement as HTMLElement);
        expect(positionedElements).toHaveLength(3);

        const tops = positionedElements
            .map((el) => parseFloat(el.style.top))
            .sort((a, b) => a - b);
        for (let i = 1; i < tops.length; i++) {
            expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(
                BETWEEN_ROW_CARD_HEIGHT_PX,
            );
        }
    });

    it('lg 未満では駅行の grid の中央列を 4.5rem にし、lg 以上では 7rem のまま', () => {
        setRows([stationRow({ stationId: 's1' })]);

        const gridDiv = el().querySelector('[data-station-id="s1"]')
            ?.parentElement?.parentElement as HTMLElement;

        expect(gridDiv.className).toContain(
            'tw-grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)]',
        );
        expect(gridDiv.className).toContain(
            'lg:tw-grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]',
        );
    });

    it('駅間行の grid も lg 未満では中央列を 4.5rem にする', () => {
        setRows([
            stationRow({ stationId: 's1' }),
            {
                kind: 'between',
                fromStationId: 's1',
                toStationId: 's2',
                leftCards: [],
                rightCards: [],
            },
            stationRow({ stationId: 's2' }),
        ]);

        const between = el().querySelector('[data-between]') as HTMLElement;
        expect(between.className).toContain(
            'tw-grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)]',
        );
        expect(between.className).toContain(
            'lg:tw-grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]',
        );
    });

    it('駅間行の絶対配置カードの包みは列の幅を超えないよう max-w を付ける', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'between',
                fromStationId: 'a',
                toStationId: 'b',
                leftCards: [{ card: card('t1'), topProgress: 0.4 }],
                rightCards: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        const wrap: HTMLElement = fixture.nativeElement.querySelector(
            'app-train-location-card',
        ).parentElement;
        expect(wrap.className).toContain('tw-max-w-[calc(100%-0.5rem)]');
    });

    it('駅の札は折り返しても WCAG 2.2 の 24px タップ領域を下回らないよう最小高さを持つ', () => {
        setRows([stationRow({ stationId: 's1' })]);

        const button = el().querySelector(
            'button[data-station-id="s1"]',
        ) as HTMLElement;
        expect(button.className).toContain('tw-min-h-6');
    });

    it('向きの見出しは「上り」「下り」だけで方面名を出さない（路線の端の駅で自駅名になるため）', () => {
        const rows: TrainLocationRow[] = [
            stationRow({
                stationId: 'yokohama',
                stationName: '横浜',
                isMajor: true,
            }),
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(/◀ 上り/);
        expect(fixture.nativeElement).not.toHaveTextContent(/方面/);
    });
});
