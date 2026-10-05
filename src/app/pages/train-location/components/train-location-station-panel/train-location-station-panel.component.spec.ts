import '@testing-library/jest-dom';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import { StationArrival } from '../../interfaces/station-arrival.interface';
import { TrainLocationStationPanelComponent } from './train-location-station-panel.component';

function arrival(o: Partial<StationArrival>): StationArrival {
    return {
        tripId: 't',
        direction: 'inbound',
        time: new Date(2026, 8, 26, 10, 4),
        minutesUntil: 4.1,
        isPassing: false,
        isTerminal: false,
        isOrigin: false,
        isStopped: false,
        tripNumber: '7560',
        tripClassName: '各停',
        tripClassColor: '#40c4ff',
        destinationName: '赤羽岩淵',
        operationNumber: '30K',
        formationNumber: '20104',
        formationAgencyName: '相鉄',
        whereText: '海老名 10:02 発',
        ...o,
    };
}

describe('TrainLocationStationPanelComponent', () => {
    let fixture: ComponentFixture<TrainLocationStationPanelComponent>;
    const el = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            imports: [TrainLocationStationPanelComponent],
            providers: [provideRouter([])],
        });
        fixture = TestBed.createComponent(TrainLocationStationPanelComponent);
    });

    it('駅が未選択なら案内だけ出す', () => {
        fixture.componentRef.setInput('stationId', null);
        fixture.detectChanges();

        expect(el()).toHaveTextContent(/図の駅名を押して駅を選ぶ/);
    });

    it('上り・下りの見出しと行（あと何分・時刻・行先・列番・運用・いまどこか）を出す', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({})],
            outbound: [],
        });
        fixture.detectChanges();

        const text = el().textContent ?? '';
        expect(text).toContain('二俣川');
        expect(text).toContain('▲ 上り');
        expect(text).not.toContain('方面');
        expect(text).toContain('▼ 下り');
        expect(text).toContain('4分');
        expect(text).toContain('10:04');
        expect(text).toContain('赤羽岩淵 行');
        expect(text).toContain('7560');
        expect(text).toContain('30K');
        expect(text).toContain('相鉄 20104');
        expect(text).toContain('海老名 10:02 発');
        expect(text).toContain('この先の列車はありません');
    });

    it('通過は「通過」と時刻に「頃」、終点は「当駅止まり」、停車中は「停車中」、1 分未満は「まもなく」', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [
                arrival({ tripId: 'p', isPassing: true, minutesUntil: 3 }),
                arrival({ tripId: 'e', isTerminal: true, minutesUntil: 5 }),
            ],
            outbound: [
                arrival({
                    tripId: 's',
                    direction: 'outbound',
                    isStopped: true,
                    minutesUntil: 0,
                }),
                arrival({
                    tripId: 'm',
                    direction: 'outbound',
                    minutesUntil: 0.5,
                }),
            ],
        });
        fixture.detectChanges();

        const text = el().textContent ?? '';
        expect(text).toContain('通過');
        expect(text).toContain('10:04頃');
        expect(text).toContain('当駅止まり');
        expect(text).toContain('停車中');
        expect(text).toContain('まもなく');
    });

    it('運用番号の地を運用群の色にする（K を含む運用は赤の淡色）', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({})],
            outbound: [],
        });
        fixture.detectChanges();

        const tag = el().querySelector(
            '[data-operation-number]',
        ) as HTMLElement;
        expect(tag.textContent?.trim()).toBe('30K');
        expect(el()).not.toHaveTextContent(/運用/);
        expect(tag).toHaveStyle({ backgroundColor: 'rgba(183, 28, 28, 0.12)' });
    });

    it('運用番号は運用行路図へのリンク（運用 ID が無ければリンクにしない）', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({ tripId: 'a', operationId: 'op-30k' })],
            outbound: [
                arrival({
                    tripId: 'b',
                    direction: 'outbound',
                    operationId: undefined,
                }),
            ],
        });
        fixture.detectChanges();

        const links = el().querySelectorAll('a[data-operation-number]');
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute(
            'href',
            '/operation/route-diagram;operation_id=op-30k',
        );
        expect(
            el().querySelectorAll('span[data-operation-number]'),
        ).toHaveLength(1);
    });

    it('種別が変わる駅を選んでいるときは 2 段: 上の段に変更前「各停 7416 →」、主の段に変更後', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [
                arrival({
                    isTerminal: false,
                    tripClassName: '各停',
                    tripNumber: '7416',
                    destinationName: '和光市',
                    continuation: {
                        tripNumber: '054052',
                        tripClassName: '急行',
                        tripClassColor: '#ff0000',
                    },
                }),
            ],
            outbound: [],
        });
        fixture.detectChanges();

        const text = (sel: string) =>
            (el().querySelector(sel) as HTMLElement).textContent?.replace(
                /\s+/g,
                '',
            );
        // 項目の間は flex の gap で空けるので、字の並びだけを比べる
        expect(text('[data-continuation]')).toBe('各停7416→');
        expect(text('[data-main-line]')).toMatch(/^急行054052和光市行/);
        expect(el()).not.toHaveTextContent(/当駅止まり/);
    });

    it('種別変更の無い列車は上の段を出さず、主の段は「種別 列番 行先」', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({})],
            outbound: [],
        });
        fixture.detectChanges();

        expect(el().querySelector('[data-continuation]')).toBeNull();
        expect(
            (
                el().querySelector('[data-main-line]') as HTMLElement
            ).textContent?.replace(/\s+/g, ''),
        ).toMatch(/^各停7560赤羽岩淵行/);
    });

    it('種別が変わる駅を選んでいるときは、主の段の種別チップを変更後の種別にする', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [
                arrival({
                    isStopped: true,
                    tripClassName: '各停',
                    tripClassColor: '#212121',
                    continuation: {
                        tripNumber: '054052',
                        tripClassName: '急行',
                        tripClassColor: '#ff0000',
                    },
                }),
            ],
            outbound: [],
        });
        fixture.detectChanges();

        const mainChip = fixture.debugElement.query(
            By.css('[data-main-class] app-trip-class-chip'),
        ).componentInstance as TripClassChipComponent;
        expect(mainChip.label()).toBe('急行');
        expect(mainChip.color()).toBe('#ff0000');
    });

    it('選んだ駅が始発の列車は「始発」', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({ isOrigin: true })],
            outbound: [
                arrival({
                    tripId: 'x',
                    direction: 'outbound',
                    isOrigin: false,
                }),
            ],
        });
        fixture.detectChanges();

        expect(el().querySelectorAll('[data-origin]')).toHaveLength(1);
        expect(el().querySelector('[data-origin]')?.textContent?.trim()).toBe(
            '始発',
        );
    });

    it('着時刻と発時刻が両方あれば「着」「発」を並べ、片方だけなら時刻 1 つ', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({ departureTime: new Date(2026, 8, 26, 10, 6) })],
            outbound: [arrival({ tripId: 'x', direction: 'outbound' })],
        });
        fixture.detectChanges();

        const times = Array.from(el().querySelectorAll('[data-time]')).map(
            (t) => t.textContent?.replace(/\s+/g, ''),
        );
        expect(times).toEqual(['10:04着10:06発', '10:04']);
    });

    it('乗換路線のチップは同じ駅を選んだ状態のリンクにする', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('interchangeRoutes', [
            { routeId: 'izumino', routeName: 'いずみ野線' },
        ]);
        fixture.detectChanges();

        const link = el().querySelector(
            'a[href*="izumino"]',
        ) as HTMLAnchorElement;
        expect(link).toHaveTextContent(/いずみ野線/);
        expect(link).toHaveAttribute(
            'href',
            expect.stringContaining('station_id=C'),
        );
    });

    it('開閉ボタンで本文を畳み、状態を覚える', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.detectChanges();

        const toggle = el().querySelector(
            'button[aria-expanded]',
        ) as HTMLButtonElement;
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        toggle.click();
        fixture.detectChanges();

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(localStorage.getItem('train-location:panel-open')).toBe('false');
    });

    it('開閉ボタンの地は白にする（theme.colors 置き換えで transparent は使えない）', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.detectChanges();

        const toggle = el().querySelector(
            'button[aria-expanded]',
        ) as HTMLButtonElement;
        expect(toggle.className).toContain('tw-bg-white');
        expect(toggle.className).not.toContain('tw-bg-transparent');
    });

    it('駅が未選択なら開閉ボタンを出さない', () => {
        fixture.componentRef.setInput('stationId', null);
        fixture.detectChanges();

        expect(el().querySelector('button[aria-expanded]')).toBeNull();
    });

    it('行先のセルは切り詰めない（スマホで列番・運用・編成が隠れない）', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({})],
            outbound: [],
        });
        fixture.detectChanges();

        expect(el().querySelector('.tw-truncate')).toBeNull();
    });

    it('あと何分は折り返さない', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({ minutesUntil: 0.5 })],
            outbound: [],
        });
        fixture.detectChanges();

        const minutes = Array.from(el().querySelectorAll('span')).find(
            (s) => s.textContent?.trim() === 'まもなく',
        ) as HTMLElement;
        expect(minutes.className).toContain('tw-whitespace-nowrap');
    });

    it('運用・編成は項目の途中で改行しない', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({})],
            outbound: [],
        });
        fixture.detectChanges();

        const nowrap = Array.from(
            el().querySelectorAll('.tw-whitespace-nowrap'),
        ).map((s) => s.textContent?.replace(/\s+/g, ''));
        expect(nowrap).toContain('・30K');
        expect(nowrap).toContain('・相鉄20104');
    });

    it('2.5分（ラベルは「2分」）の行にも淡い地を付ける（表示とグレーの判定を揃える）', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({ minutesUntil: 2.5 })],
            outbound: [],
        });
        fixture.detectChanges();

        const row = el().querySelector('.tw-bg-accent-50') as HTMLElement;
        expect(row).not.toBeNull();
        expect(row).toHaveTextContent(/2分/);
    });

    it('運用・編成の項目は間で折り返せる（項目内は改行しない）', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({})],
            outbound: [],
        });
        fixture.detectChanges();

        const operationSpan = Array.from(
            el().querySelectorAll('.tw-whitespace-nowrap'),
        ).find(
            (s) => s.textContent?.replace(/\s+/g, '') === '・30K',
        ) as HTMLElement;
        const container = operationSpan.parentElement as HTMLElement;
        expect(container.className).toContain('tw-flex-wrap');
    });
});
