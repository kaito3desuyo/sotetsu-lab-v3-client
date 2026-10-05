import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripDiagramLine } from '../../utils/build-trip-diagram-line.util';
import { TrainDiagramChartComponent } from './train-diagram-chart.component';

function makeLine(
    tripId: string,
    minMinute: number,
    maxMinute: number,
    overrides: Partial<TripDiagramLine> = {},
): TripDiagramLine {
    return {
        tripId,
        tripNumber: tripId,
        tripClassColor: '#8a8a8a',
        isDeadhead: false,
        segments: [
            [
                { minute: minMinute, y: 40 },
                { minute: maxMinute, y: 50 },
            ],
        ],
        throughLabels: [],
        stopLabels: [],
        connectors: [],
        depotMarks: [],
        minMinute,
        maxMinute,
        ...overrides,
    };
}

describe('TrainDiagramChartComponent', () => {
    let component: TrainDiagramChartComponent;
    let fixture: ComponentFixture<TrainDiagramChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramChartComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainDiagramChartComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('stationRows', []);
        fixture.componentRef.setInput('lines', []);
        fixture.componentRef.setInput('bodyHeight', 400);
        fixture.componentRef.setInput('pxPerMinute', 10);
        fixture.componentRef.setInput('axisPxPerMinute', 6);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('Task 13: bottomInset を渡すと、スクロール領域の中身の包みの padding-bottom になる（既定は 0）', () => {
        const wrapper: HTMLElement = fixture.nativeElement.querySelector(
            '[data-scroll-host] > div',
        );
        expect(wrapper).toHaveStyle({ paddingBottom: '0px' });

        fixture.componentRef.setInput('bottomInset', 120);
        fixture.detectChanges();

        expect(wrapper).toHaveStyle({ paddingBottom: '120px' });
    });

    it('時刻の行は見えている範囲の10分刻みの字を出し、正時の字は太字になる', () => {
        // 初回レンダー後の afterNextRender（#measure）で visibleRange が更新されるため、
        // 直後にもう一度 detectChanges してから DOM を読む。
        fixture.detectChanges();

        const texts: NodeListOf<SVGTextElement> =
            fixture.nativeElement.querySelectorAll(
                'svg[data-time-header] text',
            );
        const ticks = component.minuteTicks();

        // 見えている範囲（±30分の余白込み）の10分刻みぶん、正時以外も字が出る
        expect(texts.length).toBe(ticks.length);
        expect(texts.length).toBeGreaterThan(1);

        // 最初のtick（4:00）は正時なので太字
        expect(ticks[0].isHour).toBe(true);
        expect(texts[0].textContent?.trim()).toBe('4:00');
        expect(texts[0]).toHaveStyle({ fontWeight: 'bold' });

        // 正時以外（4:10）は太字でない
        const nonHourIndex = ticks.findIndex((tick) => !tick.isHour);
        expect(nonHourIndex).toBeGreaterThan(-1);
        expect(texts[nonHourIndex].textContent?.trim()).toBe('4:10');
        expect(texts[nonHourIndex]).not.toHaveStyle({ fontWeight: 'bold' });
    });

    it('lines に0〜50分の線と900〜950分の線を渡すと、遠く離れた900〜950分の線は見えている範囲外なので描かれない（jsdom は clientWidth=0 のため可視範囲は0分近辺）', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 50),
            makeLine('t2', 900, 950),
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        const polylines: NodeListOf<SVGPolylineElement> =
            fixture.nativeElement.querySelectorAll('polyline[data-trip-line]');
        expect(polylines.length).toBe(1);
        expect(polylines[0]).toHaveAttribute('data-trip-id', 't1');
    });

    it('直通先ラベルが重なる場合は間引いて表示する（同じ行で重なるものは後の方を消す）', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 1, {
                throughLabels: [
                    { minute: 0, y: 100, text: '渋谷', anchor: 'start' },
                ],
            }),
            makeLine('t2', 0, 1, {
                throughLabels: [
                    { minute: 1, y: 100, text: '新宿', anchor: 'start' },
                ],
            }),
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        const labels: NodeListOf<SVGTextElement> =
            fixture.nativeElement.querySelectorAll('[data-through-label]');
        expect(labels.length).toBe(1);
        expect(labels[0].textContent?.trim()).toBe('渋谷');
    });

    it('選んだ列車の直通先ラベルは、重なる非選択のラベルより優先して表示する', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 1, {
                throughLabels: [
                    { minute: 0, y: 100, text: '新宿', anchor: 'start' },
                ],
            }),
            makeLine('t2', 0, 1, {
                throughLabels: [
                    { minute: 1, y: 100, text: '渋谷', anchor: 'start' },
                ],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t2']));
        fixture.detectChanges();
        await fixture.whenStable();

        const labels: NodeListOf<SVGTextElement> =
            fixture.nativeElement.querySelectorAll('[data-through-label]');
        expect(labels.length).toBe(1);
        expect(labels[0].textContent?.trim()).toBe('渋谷');
    });

    it('Task 16: 行き先ラベル（anchor:start）は線の上、始発駅ラベル（anchor:end）は線の下に描かれる', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 1, {
                throughLabels: [
                    { minute: 0, y: 100, text: '→ 渋谷', anchor: 'start' },
                ],
            }),
            makeLine('t2', 0, 1, {
                throughLabels: [
                    { minute: 0, y: 100, text: '海老名 →', anchor: 'end' },
                ],
            }),
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        const labels: NodeListOf<SVGTextElement> =
            fixture.nativeElement.querySelectorAll('[data-through-label]');
        // 同じ x/y の候補でも上下に分かれるため両方残る。
        expect(labels.length).toBe(2);

        const destination = Array.from(labels).find(
            (l) => l.textContent?.trim() === '→ 渋谷',
        );
        const origin = Array.from(labels).find(
            (l) => l.textContent?.trim() === '海老名 →',
        );
        expect(destination).toHaveAttribute('y', '96'); // 100 - 4
        expect(origin).toHaveAttribute('y', '111'); // 100 + 11
    });

    it('Task 16: 選んだ列車の行き先ラベルは停車分ラベルの右へずれ、始発駅ラベルの位置は変わらない', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 10, {
                throughLabels: [
                    { minute: 10, y: 100, text: '→ 渋谷', anchor: 'start' },
                    { minute: 0, y: 40, text: '海老名 →', anchor: 'end' },
                ],
                stopLabels: [{ minute: 10, y: 100, text: '23', side: 'above' }],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const labels: NodeListOf<SVGTextElement> =
            fixture.nativeElement.querySelectorAll('[data-through-label]');
        const destination = Array.from(labels).find(
            (l) => l.textContent?.trim() === '→ 渋谷',
        )!;
        const origin = Array.from(labels).find(
            (l) => l.textContent?.trim() === '海老名 →',
        )!;
        // 通常は 10*10+4=104 のところ、停車分ラベルを避けて 10*10+3+12+4=119 になる。
        expect(destination).toHaveAttribute('x', '119');
        // 始発駅ラベルはずれない（従来どおり x - 4）。
        expect(origin).toHaveAttribute('x', '-4');

        const stopLabel: SVGTextElement =
            fixture.nativeElement.querySelector('[data-stop-label]');
        const stopLabelX = Number(stopLabel.getAttribute('x'));
        const destinationX = Number(destination.getAttribute('x'));
        expect(destinationX).toBeGreaterThan(stopLabelX + 10); // 重ならない
    });

    it('Task 16: 何か選んでいる間、強調外の線の直通先ラベルは opacity 0.15、強調中は 1', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 1, {
                throughLabels: [
                    { minute: 0, y: 100, text: '渋谷', anchor: 'start' },
                ],
            }),
            makeLine('t2', 0, 1, {
                throughLabels: [
                    { minute: 50, y: 100, text: '新宿', anchor: 'start' },
                ],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const labels: NodeListOf<SVGTextElement> =
            fixture.nativeElement.querySelectorAll('[data-through-label]');
        const highlighted = Array.from(labels).find(
            (l) => l.textContent?.trim() === '渋谷',
        );
        const dimmed = Array.from(labels).find(
            (l) => l.textContent?.trim() === '新宿',
        );
        expect(highlighted).toHaveAttribute('opacity', '1');
        expect(dimmed).toHaveAttribute('opacity', '0.15');
    });

    it('highlightedTripIds に900〜950分の線の tripId を入れると、その線も描かれ、[data-stop-label]が出る（強調していない線には出ない）', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 50),
            makeLine('t2', 900, 950, {
                stopLabels: [{ minute: 900, y: 50, text: '05', side: 'above' }],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t2']));
        fixture.detectChanges();
        await fixture.whenStable();

        const polylines: NodeListOf<SVGPolylineElement> =
            fixture.nativeElement.querySelectorAll('polyline[data-trip-line]');
        const ids = Array.from(polylines).map((p) =>
            p.getAttribute('data-trip-id'),
        );
        expect(ids).toContain('t1');
        expect(ids).toContain('t2');

        const stopLabels =
            fixture.nativeElement.querySelectorAll('[data-stop-label]');
        expect(stopLabels.length).toBe(1);
    });

    it("Task 19: 停車分ラベルの side が 'below' なら y + 10、'above' なら従来どおり y - 3 に描く", async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 10, {
                stopLabels: [
                    { minute: 0, y: 100, text: '00', side: 'above' },
                    { minute: 10, y: 80, text: '10', side: 'below' },
                ],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const labels: NodeListOf<SVGTextElement> =
            fixture.nativeElement.querySelectorAll('[data-stop-label]');
        expect(labels.length).toBe(2);
        expect(labels[0]).toHaveAttribute('y', '97'); // 100 - 3
        expect(labels[1]).toHaveAttribute('y', '90'); // 80 + 10
    });

    it('Task 20: 列車番号は先頭点の左上（x-4, text-anchor:end, y-6）に描かれ、線・停車分ラベル・始発駅ラベルと被らない', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 10, 20, {
                tripNumber: '1234',
                isChainHead: true,
                stopLabels: [{ minute: 10, y: 40, text: '10', side: 'above' }],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const tripNumber: SVGTextElement =
            fixture.nativeElement.querySelector('[data-trip-number]');
        expect(tripNumber).toBeTruthy();
        expect(tripNumber.textContent?.trim()).toBe('1234');
        // 先頭点 x=10*10=100 の左上: x-4=96, text-anchor=end, y-6=34
        expect(tripNumber).toHaveAttribute('x', '96');
        expect(tripNumber).toHaveAttribute('y', '34');
        expect(tripNumber).toHaveAttribute('text-anchor', 'end');
    });

    it("Task 19: 選んだ列車の最後の停車分ラベルが 'below' なら、行き先ラベルは停車分ラベルを避けてずらさない", async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 10, {
                throughLabels: [
                    { minute: 10, y: 80, text: '→ 渋谷', anchor: 'start' },
                ],
                stopLabels: [{ minute: 10, y: 80, text: '10', side: 'below' }],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const destination: SVGTextElement = fixture.nativeElement.querySelector(
            '[data-through-label]',
        );
        // 停車分ラベルが下（side: 'below'）にあり基準線が別れているため、
        // ずらさない従来どおりの位置（10*10+4=104）になる。
        expect(destination).toHaveAttribute('x', '104');
    });

    it('highlightedTripIds に2本入れると両方が太線（stroke-width 4）、他は薄い。強調中の線を押すと tripActivated', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 50),
            makeLine('t2', 60, 100),
            makeLine('t3', 0, 50),
        ]);
        fixture.componentRef.setInput(
            'highlightedTripIds',
            new Set(['t1', 't2']),
        );
        fixture.detectChanges();
        await fixture.whenStable();

        const polylineOf = (tripId: string): SVGPolylineElement =>
            fixture.nativeElement.querySelector(
                `polyline[data-trip-line][data-trip-id="${tripId}"]`,
            );

        expect(polylineOf('t1')).toHaveAttribute('stroke-width', '4');
        expect(polylineOf('t2')).toHaveAttribute('stroke-width', '4');
        expect(polylineOf('t3')).toHaveAttribute('stroke-width', '2');
        expect(polylineOf('t3')).toHaveAttribute('opacity', '0.15');

        const activateSpy = jest.spyOn(component.tripActivated, 'emit');
        polylineOf('t2').dispatchEvent(new MouseEvent('click'));
        expect(activateSpy).toHaveBeenCalledWith('t2');
    });

    it('connector を持つ線を渡すと [data-trip-connector] が点線（stroke-dasharray="2 3"）で描かれる', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 50, {
                connectors: [{ minute: 20, fromY: 10, toY: 40 }],
            }),
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        const connectors: NodeListOf<SVGLineElement> =
            fixture.nativeElement.querySelectorAll('[data-trip-connector]');
        expect(connectors.length).toBe(1);
        expect(connectors[0]).toHaveAttribute('stroke-dasharray', '2 3');
        expect(connectors[0]).toHaveAttribute('y1', '10');
        expect(connectors[0]).toHaveAttribute('y2', '40');
        // Task 13: 点線を薄く（stroke-opacity 0.45・通常時 stroke-width 1）
        expect(connectors[0]).toHaveAttribute('stroke-opacity', '0.45');
        expect(connectors[0]).toHaveAttribute('stroke-width', '1');
    });

    it('強調中の線の connector は stroke-width 1.5（薄さの stroke-opacity 0.45 は変わらない）', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 50, {
                connectors: [{ minute: 20, fromY: 10, toY: 40 }],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const connectors: NodeListOf<SVGLineElement> =
            fixture.nativeElement.querySelectorAll('[data-trip-connector]');
        expect(connectors[0]).toHaveAttribute('stroke-width', '1.5');
        expect(connectors[0]).toHaveAttribute('stroke-opacity', '0.45');
    });

    it('Task 14: depotMarks の out は [data-depot-mark="out"] の circle、in は polygon で描かれる', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 50, {
                depotMarks: [
                    { kind: 'out', minute: 0, y: 40 },
                    { kind: 'in', minute: 50, y: 60 },
                ],
            }),
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        const outMark: SVGCircleElement = fixture.nativeElement.querySelector(
            'circle[data-depot-mark="out"]',
        );
        expect(outMark).toBeTruthy();
        expect(outMark).toHaveAttribute('cx', '0');
        expect(outMark).toHaveAttribute('cy', '40');
        expect(outMark).toHaveAttribute('stroke', '#8a8a8a');
        expect(outMark).toHaveAttribute('fill', 'white');

        const inMark: SVGPolygonElement = fixture.nativeElement.querySelector(
            'polygon[data-depot-mark="in"]',
        );
        expect(inMark).toBeTruthy();
        expect(inMark).toHaveAttribute('stroke', '#8a8a8a');
        expect(inMark).toHaveAttribute('fill', 'white');
    });

    it('Task 14: depotMarks も強調の薄め表示（lineOpacity）に従う', async () => {
        fixture.componentRef.setInput('lines', [
            makeLine('t1', 0, 50, {
                depotMarks: [{ kind: 'out', minute: 0, y: 40 }],
            }),
            makeLine('t2', 0, 50, {
                depotMarks: [{ kind: 'in', minute: 50, y: 40 }],
            }),
        ]);
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const outMark: SVGCircleElement = fixture.nativeElement.querySelector(
            'circle[data-depot-mark="out"]',
        );
        const inMark: SVGPolygonElement = fixture.nativeElement.querySelector(
            'polygon[data-depot-mark="in"]',
        );
        expect(outMark).toHaveAttribute('opacity', '1');
        expect(inMark).toHaveAttribute('opacity', '0.15');
    });

    it('線をクリックすると tripSelected にその id、選択中の線をクリックすると tripActivated', async () => {
        fixture.componentRef.setInput('lines', [makeLine('t1', 0, 50)]);
        fixture.detectChanges();
        await fixture.whenStable();

        const selectSpy = jest.spyOn(component.tripSelected, 'emit');
        const polyline: SVGPolylineElement =
            fixture.nativeElement.querySelector('polyline[data-trip-line]');
        polyline.dispatchEvent(new MouseEvent('click'));
        expect(selectSpy).toHaveBeenCalledWith('t1');

        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();
        await fixture.whenStable();

        const activateSpy = jest.spyOn(component.tripActivated, 'emit');
        const polyline2: SVGPolylineElement =
            fixture.nativeElement.querySelector('polyline[data-trip-line]');
        polyline2.dispatchEvent(new MouseEvent('click'));
        expect(activateSpy).toHaveBeenCalledWith('t1');
    });

    it('背景（rect）のクリックで、選択中なら tripSelected に null', () => {
        fixture.componentRef.setInput('highlightedTripIds', new Set(['t1']));
        fixture.detectChanges();

        const spy = jest.spyOn(component.tripSelected, 'emit');
        const rect: SVGRectElement = fixture.nativeElement.querySelector(
            'svg[data-diagram-body] rect',
        );
        rect.dispatchEvent(new MouseEvent('click'));
        expect(spy).toHaveBeenCalledWith(null);
    });

    describe('Task 14: turnbackLinks（折り返しの⊐字リンク）', () => {
        function makeLink(
            arrivingTripId: string,
            departingTripId: string,
            minMinute: number,
            maxMinute: number,
            connectors: { minute: number; fromY: number; toY: number }[] = [],
        ) {
            return {
                arrivingTripId,
                departingTripId,
                points: [
                    { minute: minMinute, y: 40 },
                    { minute: minMinute, y: 44 },
                    { minute: maxMinute, y: 44 },
                    { minute: maxMinute, y: 40 },
                ],
                color: '#8a8a8a',
                minMinute,
                maxMinute,
                connectors,
            };
        }

        it('turnbackLinks を渡すと [data-turnback-link] が描かれる', async () => {
            fixture.componentRef.setInput('turnbackLinks', [
                makeLink('arr', 'dep', 0, 10),
            ]);
            fixture.detectChanges();
            await fixture.whenStable();

            const links = fixture.nativeElement.querySelectorAll(
                '[data-turnback-link]',
            );
            expect(links.length).toBe(1);
        });

        it('見えている範囲外の turnbackLinks は描かれない（jsdom は可視範囲が0分近辺）', async () => {
            fixture.componentRef.setInput('turnbackLinks', [
                makeLink('arr1', 'dep1', 0, 10),
                makeLink('arr2', 'dep2', 900, 950),
            ]);
            fixture.detectChanges();
            await fixture.whenStable();

            const links = fixture.nativeElement.querySelectorAll(
                '[data-turnback-link]',
            );
            expect(links.length).toBe(1);
        });

        it('fix round 2: connector を持つ turnbackLinks は [data-turnback-connector] を点線（stroke-dasharray="2 3"）で描く', async () => {
            fixture.componentRef.setInput('turnbackLinks', [
                makeLink('arr', 'dep', 0, 10, [
                    { minute: 10, fromY: 40, toY: 90 },
                ]),
            ]);
            fixture.detectChanges();
            await fixture.whenStable();

            const connectors = fixture.nativeElement.querySelectorAll(
                '[data-turnback-connector]',
            );
            expect(connectors.length).toBe(1);
            expect(connectors[0]).toHaveAttribute('stroke-dasharray', '2 3');
            expect(connectors[0]).toHaveAttribute('stroke-opacity', '0.45');
            expect(connectors[0]).toHaveAttribute('y1', '40');
            expect(connectors[0]).toHaveAttribute('y2', '90');
            expect(connectors[0]).toHaveAttribute('stroke-width', '1');
        });

        it('fix round 2: connector が無い turnbackLinks には [data-turnback-connector] が出ない', async () => {
            fixture.componentRef.setInput('turnbackLinks', [
                makeLink('arr', 'dep', 0, 10),
            ]);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(
                fixture.nativeElement.querySelector(
                    '[data-turnback-connector]',
                ),
            ).toBeNull();
        });

        it('fix round 2: 強調中の turnbackLinks の connector は stroke-width 1.5', async () => {
            fixture.componentRef.setInput('turnbackLinks', [
                makeLink('arr', 'dep', 0, 10, [
                    { minute: 10, fromY: 40, toY: 90 },
                ]),
            ]);
            fixture.componentRef.setInput(
                'highlightedTripIds',
                new Set(['arr']),
            );
            fixture.detectChanges();
            await fixture.whenStable();

            const connector = fixture.nativeElement.querySelector(
                '[data-turnback-connector]',
            );
            expect(connector).toHaveAttribute('stroke-width', '1.5');
        });

        it('Task 18: connectors を2つ持つ turnbackLinks は [data-turnback-connector] を2本描く', async () => {
            fixture.componentRef.setInput('turnbackLinks', [
                makeLink('arr', 'dep', 0, 10, [
                    { minute: 0, fromY: 90, toY: 40 },
                    { minute: 10, fromY: 40, toY: 90 },
                ]),
            ]);
            fixture.detectChanges();
            await fixture.whenStable();

            const connectors = fixture.nativeElement.querySelectorAll(
                '[data-turnback-connector]',
            );
            expect(connectors.length).toBe(2);
        });
    });

    describe('onWheel', () => {
        function makeWheelEvent(init: Partial<WheelEvent>): WheelEvent {
            return {
                deltaY: -1,
                shiftKey: false,
                ctrlKey: true,
                metaKey: false,
                preventDefault: jest.fn(),
                ...init,
            } as unknown as WheelEvent;
        }

        it('Ctrl+ホイール（deltaY<0）で axisPxPerMinuteChange に 6 * 1.1', () => {
            const spy = jest.spyOn(component.axisPxPerMinuteChange, 'emit');
            component.onWheel(makeWheelEvent({}));
            expect(spy).toHaveBeenCalledWith(6 * 1.1);
        });

        it('Ctrl+Shift+ホイールで pxPerMinuteChange に 10 * 1.1', () => {
            const spy = jest.spyOn(component.pxPerMinuteChange, 'emit');
            component.onWheel(makeWheelEvent({ shiftKey: true }));
            expect(spy).toHaveBeenCalledWith(10 * 1.1);
        });

        it('修飾キーなしでは何も出ない', () => {
            const axisSpy = jest.spyOn(component.axisPxPerMinuteChange, 'emit');
            const pxSpy = jest.spyOn(component.pxPerMinuteChange, 'emit');
            component.onWheel(makeWheelEvent({ ctrlKey: false }));
            expect(axisSpy).not.toHaveBeenCalled();
            expect(pxSpy).not.toHaveBeenCalled();
        });
    });

    it('nowMinute が数値なら[data-now-line]が出て、null なら出ない', () => {
        expect(
            fixture.nativeElement.querySelector('[data-now-line]'),
        ).toBeNull();

        fixture.componentRef.setInput('nowMinute', 500);
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('[data-now-line]'),
        ).toBeTruthy();
    });

    describe('スクロール・跳ぶ要求の副作用', () => {
        afterEach(() => {
            jest.useRealTimers();
        });

        it('300ms 以内に 2 回 scroll しても leftMinuteChange は 1 回だけ、scrollLeft / pxPerMinute で出る', () => {
            jest.useFakeTimers();
            const host: HTMLDivElement =
                fixture.nativeElement.querySelector('[data-scroll-host]');
            const spy = jest.spyOn(component.leftMinuteChange, 'emit');

            host.scrollLeft = 100;
            component.onScroll();
            jest.advanceTimersByTime(100);

            host.scrollLeft = 250;
            component.onScroll();
            jest.advanceTimersByTime(300);

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith(25); // 250 / pxPerMinute(10)
        });

        it('jumpRequest を設定すると、レンダー後に host の scrollLeft が minute * pxPerMinute になる（align: start）', async () => {
            fixture.componentRef.setInput('jumpRequest', {
                minute: 30,
                align: 'start',
                seq: 1,
            });
            fixture.detectChanges();
            await fixture.whenStable();

            const host: HTMLDivElement =
                fixture.nativeElement.querySelector('[data-scroll-host]');
            expect(host.scrollLeft).toBe(30 * 10); // pxPerMinute(10)
        });

        it('M3: pxPerMinute を変えても画面中央の時刻を保つ（センターキープ）', async () => {
            const host: HTMLDivElement =
                fixture.nativeElement.querySelector('[data-scroll-host]');
            // jsdom は既定 clientWidth=0 のため、駅ラベル幅(88)を足した値を明示する。
            Object.defineProperty(host, 'clientWidth', {
                configurable: true,
                value: 288, // 見えている幅 = 288 - 88(STATION_LABEL_WIDTH) = 200
            });
            host.scrollLeft = 1000;

            fixture.componentRef.setInput('pxPerMinute', 16);
            fixture.detectChanges();
            await fixture.whenStable();

            // 変更前の中央の分 = (1000 + 200/2) / 10 = 110
            // 変更後の scrollLeft = 110 * 16 - 200/2 = 1660
            expect(host.scrollLeft).toBe(1660);
        });
    });
});
