import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripDiagramLine } from '../../utils/build-trip-diagram-line.util';
import { TrainDiagramChartComponent } from './train-diagram-chart.component';

describe('TrainDiagramChartComponent', () => {
    let component: TrainDiagramChartComponent;
    let fixture: ComponentFixture<TrainDiagramChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramChartComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainDiagramChartComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('stations', []);
        fixture.componentRef.setInput('axis', null);
        fixture.componentRef.setInput('tripBlocksByDirection', {});
        fixture.componentRef.setInput('windowStartHour', 7);
        fixture.componentRef.setInput('pxPerMinute', 10);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('axis が無ければ描画対象の線は空になる', () => {
        expect(component.lines()).toEqual([]);
    });

    it('stationRows: 極端に狭い駅間（高速通過区間）でも最小行高まで底上げされ、駅名ラベルが重ならない（G7）', () => {
        fixture.componentRef.setInput('axis', [
            { stationId: 's1', y: 0 },
            { stationId: 's2', y: 0.1 }, // ほぼ同一 y = 潰れて重なる区間
            { stationId: 's3', y: 100 }, // 通常区間はそのまま比率維持
        ]);
        fixture.detectChanges();

        const rows = component.stationRows();
        expect(rows[1].y - rows[0].y).toBeGreaterThanOrEqual(22);
        // 十分広い区間は底上げされず、所要時間比が維持される
        expect(rows[2].y).toBeGreaterThan(rows[1].y + 500);
    });

    it('onLineClick: 未選択の trip をクリックすると tripSelected を emit する', () => {
        const spy = jest.spyOn(component.tripSelected, 'emit');
        component.onLineClick('t1');
        expect(spy).toHaveBeenCalledWith('t1');
    });

    it('onLineClick: 選択中の trip を再クリックすると tripActivated を emit する', () => {
        fixture.componentRef.setInput('selectedTripId', 't1');
        fixture.detectChanges();

        const spy = jest.spyOn(component.tripActivated, 'emit');
        component.onLineClick('t1');
        expect(spy).toHaveBeenCalledWith('t1');
    });

    it('onBackgroundClick: 選択中なら解除する', () => {
        fixture.componentRef.setInput('selectedTripId', 't1');
        fixture.detectChanges();

        const spy = jest.spyOn(component.tripSelected, 'emit');
        component.onBackgroundClick();
        expect(spy).toHaveBeenCalledWith(null);
    });

    it('onBackgroundClick: 未選択なら emit しない', () => {
        const spy = jest.spyOn(component.tripSelected, 'emit');
        component.onBackgroundClick();
        expect(spy).not.toHaveBeenCalled();
    });

    it('lineOpacity: 非選択トリップは強めに減光される (0.15)', () => {
        fixture.componentRef.setInput('selectedTripId', 't1');
        fixture.detectChanges();

        expect(component.lineOpacity('t2')).toBe(0.15);
        expect(component.lineOpacity('t1')).toBe(1);
    });

    describe('orderedLines', () => {
        function makeLine(tripId: string): TripDiagramLine {
            return {
                tripId,
                tripNumber: tripId,
                tripClassColor: '#8a8a8a',
                isDeadhead: false,
                segments: [
                    [
                        { x: 0, y: 40 },
                        { x: 10, y: 50 },
                    ],
                ],
                throughLabels: [],
            };
        }

        /**
         * lines() をモックし、selectedTripId を設定して再描画する。
         * orderedLines は computed のため、beforeEach 時点の評価結果（空配列）が
         * メモ化されている。依存シグナル selectedTripId を一度別値に変えて
         * 再計算を強制することで、モック後の lines() を確実に読ませる。
         */
        function setupLines(
            lines: TripDiagramLine[],
            selectedTripId: string | null,
        ): void {
            jest.spyOn(
                component,
                'lines' as keyof TrainDiagramChartComponent as never,
            ).mockReturnValue(lines as never);
            fixture.componentRef.setInput('selectedTripId', '__invalidate__');
            fixture.componentRef.setInput('selectedTripId', selectedTripId);
            fixture.detectChanges();
        }

        it('選択中トリップが最後（最前面）に並べ替えられる', () => {
            setupLines([makeLine('t1'), makeLine('t2'), makeLine('t3')], 't2');

            expect(component.orderedLines().map((l) => l.tripId)).toEqual([
                't1',
                't3',
                't2',
            ]);
        });

        it('未選択時は元の順序のまま', () => {
            setupLines([makeLine('t1'), makeLine('t2')], null);

            expect(component.orderedLines().map((l) => l.tripId)).toEqual([
                't1',
                't2',
            ]);
        });

        it('選択中はハロー（白の下敷き polyline）が描画される', () => {
            setupLines([makeLine('t1'), makeLine('t2')], 't1');

            const halos: NodeListOf<SVGPolylineElement> =
                fixture.nativeElement.querySelectorAll(
                    'polyline[stroke="#ffffff"]',
                );
            expect(halos.length).toBe(1);
            expect(halos[0]).toHaveAttribute('stroke-width', '9');
        });

        it('未選択時はハローが描画されない', () => {
            setupLines([makeLine('t1'), makeLine('t2')], null);

            const halos = fixture.nativeElement.querySelectorAll(
                'polyline[stroke="#ffffff"]',
            );
            expect(halos.length).toBe(0);
            // ライン本体は描画されていること（ハローだけが無いことの確認）
            const bodies = fixture.nativeElement.querySelectorAll(
                'polyline[stroke="#8a8a8a"]',
            );
            expect(bodies.length).toBe(2);
        });
    });

    describe('onWheel', () => {
        function makeWheelEvent(init: Partial<WheelEvent>): WheelEvent {
            return {
                deltaY: -1,
                shiftKey: false,
                ctrlKey: false,
                metaKey: false,
                preventDefault: jest.fn(),
                ...init,
            } as unknown as WheelEvent;
        }

        it('修飾キーなしの wheel は何もせず preventDefault もしない（ページスクロールに委ねる）', () => {
            const event = makeWheelEvent({});
            component.onWheel(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('Shift のみの wheel は何もせず preventDefault もしない（ページスクロールに委ねる）', () => {
            const event = makeWheelEvent({ shiftKey: true });
            component.onWheel(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('Ctrl+wheel は preventDefault して縦（駅軸）縮尺を変更する', () => {
            fixture.componentRef.setInput('axis', [
                { stationId: 's1', y: 0 },
                { stationId: 's2', y: 10 },
            ]);
            fixture.detectChanges();

            const before = component.svgHeight();
            const event = makeWheelEvent({ ctrlKey: true, deltaY: -1 });
            component.onWheel(event);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(component.svgHeight()).toBeGreaterThan(before);
        });

        it('Ctrl+Shift+wheel は preventDefault して横（時間軸）縮尺を変更する', () => {
            const before = component.svgWidth();
            const event = makeWheelEvent({
                ctrlKey: true,
                shiftKey: true,
                deltaY: -1,
            });
            component.onWheel(event);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(component.svgWidth()).toBeGreaterThan(before);
        });

        it('metaKey（Mac の Cmd）でも Ctrl 同様にズームとして扱う', () => {
            const event = makeWheelEvent({ metaKey: true, deltaY: -1 });
            component.onWheel(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });
});
