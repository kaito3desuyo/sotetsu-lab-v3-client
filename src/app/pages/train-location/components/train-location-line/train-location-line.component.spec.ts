import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrainLocationCard } from '../../interfaces/train-location-card.interface';
import { TrainLocationRow } from '../../interfaces/train-location-row.interface';
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

describe('TrainLocationLineComponent', () => {
    let fixture: ComponentFixture<TrainLocationLineComponent>;
    let component: TrainLocationLineComponent;

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

    it('同一駅に上り2本停車中の場合「2本停車中」バッジを表示し、タップでオーバーレイに2枚展開する', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'station',
                stationId: 'yokohama',
                stationName: '横浜',
                isMajor: true,
                leftCards: [card('t1'), card('t2')],
                rightCards: [],
                interchangeRoutes: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('2本停車中');
        // 展開前は個別カード（tripNumber）が描画されていない
        expect(fixture.nativeElement.textContent).not.toContain('t1');

        const badge: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        badge.click();
        fixture.detectChanges();

        // カードはオーバーレイコンテナに描画される（駅行の中には描画しない）
        const overlayElement = TestBed.inject(OverlayContainer).getContainerElement();
        expect(
            overlayElement.querySelectorAll('app-train-location-card').length,
        ).toBe(2);
        expect(overlayElement.textContent).toContain('t1');
        expect(overlayElement.textContent).toContain('t2');
    });

    it('展開しても駅名セル（駅軸）側にはカードを追加しない（レイアウト非干渉）', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'station',
                stationId: 'yokohama',
                stationName: '横浜',
                isMajor: true,
                leftCards: [card('t1'), card('t2')],
                rightCards: [],
                interchangeRoutes: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        const badge: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        badge.click();
        fixture.detectChanges();

        // 展開後もコンポーネント本体（駅行）にはカードが増えない
        expect(
            fixture.nativeElement.querySelectorAll('app-train-location-card')
                .length,
        ).toBe(0);
    });

    it('再タップでオーバーレイを畳む', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'station',
                stationId: 'yokohama',
                stationName: '横浜',
                isMajor: true,
                leftCards: [card('t1'), card('t2')],
                rightCards: [],
                interchangeRoutes: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        const badge: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        badge.click();
        fixture.detectChanges();
        badge.click();
        fixture.detectChanges();

        const overlayElement = TestBed.inject(OverlayContainer).getContainerElement();
        expect(
            overlayElement.querySelectorAll('app-train-location-card').length,
        ).toBe(0);
    });

    it('停車が1本のみの場合はバッジを出さずカードを直接表示する', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'station',
                stationId: 'yokohama',
                stationName: '横浜',
                isMajor: false,
                leftCards: [card('t1')],
                rightCards: [],
                interchangeRoutes: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('本停車中');
        expect(
            fixture.nativeElement.querySelectorAll('app-train-location-card').length,
        ).toBe(1);
    });

    it('乗換路線がある駅には他路線への routerLink チップを表示する', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'station',
                stationId: 'futamatagawa',
                stationName: '二俣川',
                isMajor: true,
                leftCards: [],
                rightCards: [],
                interchangeRoutes: [{ routeId: 'r-main', routeName: '本線' }],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
        expect(link.textContent).toContain('本線');
        expect(link.getAttribute('href')).toContain('r-main');
    });

    it('乗換路線が無い駅にはチップを表示しない', () => {
        const rows: TrainLocationRow[] = [
            {
                kind: 'station',
                stationId: 'ebina',
                stationName: '海老名',
                isMajor: false,
                leftCards: [],
                rightCards: [],
                interchangeRoutes: [],
            },
        ];
        fixture.componentRef.setInput('rows', rows);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('a')).toBeNull();
    });

    it('between 行のカードは topProgress を top% に反映する', () => {
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
        expect(positioned.style.top).toBe('40%');
    });
});
