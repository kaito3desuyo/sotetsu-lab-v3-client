import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FilterChipOption } from './filter-chip-option.type';
import { FilterChipsComponent } from './filter-chips.component';

describe('FilterChipsComponent', () => {
    let component: FilterChipsComponent;
    let fixture: ComponentFixture<FilterChipsComponent>;

    const options: FilterChipOption[] = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C', disabled: true },
    ];

    // mat-chip-option の実際のクリック可能要素（button[matChipAction]）を
    // クリックしてユーザー操作を模擬する
    function clickChip(index: number): void {
        const chipOptions = fixture.debugElement.queryAll(
            By.css('mat-chip-option'),
        );
        const action = chipOptions[index].query(
            By.css('.mat-mdc-chip-action'),
        );
        action.nativeElement.click();
        fixture.detectChanges();
    }

    function isChipSelected(index: number): boolean {
        const chipOptions = fixture.debugElement.queryAll(
            By.css('mat-chip-option'),
        );
        return chipOptions[index].nativeElement.classList.contains(
            'mat-mdc-chip-selected',
        );
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [FilterChipsComponent],
        });

        fixture = TestBed.createComponent(FilterChipsComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('options', options);
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    describe('multiple モード', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('mode', 'multiple');
            fixture.componentRef.setInput('selected', []);
            fixture.detectChanges();
        });

        it('複数のチップを選択すると selectedChange が両方の値で発火する', () => {
            const emitted: unknown[][] = [];
            component.selectedChange.subscribe((value) => emitted.push(value));

            clickChip(0);
            // controlled component のため、利用側が selected を更新したものとして反映する
            fixture.componentRef.setInput('selected', ['a']);
            fixture.detectChanges();

            clickChip(1);

            expect(emitted[0]).toEqual(['a']);
            expect(emitted[1]).toEqual(['a', 'b']);
        });

        it('選択済みチップをクリックすると selectedChange から除外される', () => {
            fixture.componentRef.setInput('selected', ['a', 'b']);
            fixture.detectChanges();

            const emitted: unknown[][] = [];
            component.selectedChange.subscribe((value) => emitted.push(value));

            clickChip(0);

            expect(emitted[0]).toEqual(['b']);
        });

        it('disabled オプションは非活性でクリックしても選択されない', () => {
            const emitted: unknown[][] = [];
            component.selectedChange.subscribe((value) => emitted.push(value));

            const chipOptions = fixture.debugElement.queryAll(
                By.css('mat-chip-option'),
            );

            expect(
                chipOptions[2].nativeElement.classList.contains(
                    'mat-mdc-chip-disabled',
                ),
            ).toBe(true);

            clickChip(2);

            expect(emitted.length).toBe(0);
            expect(isChipSelected(2)).toBe(false);
        });

        it('● マーカーを表示しない', () => {
            const text: string = fixture.nativeElement.textContent;
            expect(text).not.toContain('●');
        });
    });

    describe('single モード', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('mode', 'single');
            fixture.componentRef.setInput('selected', []);
            fixture.detectChanges();
        });

        it('未選択の状態では ● マーカーを表示しない（箇条書き風の点を全チップに出さない）', () => {
            const text: string = fixture.nativeElement.textContent;
            expect(text).not.toContain('●');
        });

        it('選択中のチップにのみ先頭に ● マーカーを表示する', () => {
            fixture.componentRef.setInput('selected', ['a']);
            fixture.detectChanges();

            const chipOptions = fixture.debugElement.queryAll(
                By.css('mat-chip-option'),
            );
            expect(chipOptions[0].nativeElement.textContent).toContain('●');
            expect(chipOptions[1].nativeElement.textContent).not.toContain('●');
            expect(chipOptions[2].nativeElement.textContent).not.toContain('●');
        });

        it('選択すると selectedChange が単一値の配列で発火する', () => {
            const emitted: unknown[][] = [];
            component.selectedChange.subscribe((value) => emitted.push(value));

            clickChip(0);

            expect(emitted[0]).toEqual(['a']);
        });

        it('別のチップを選択すると排他的に切り替わる', () => {
            fixture.componentRef.setInput('selected', ['a']);
            fixture.detectChanges();

            expect(isChipSelected(0)).toBe(true);
            expect(isChipSelected(1)).toBe(false);

            const emitted: unknown[][] = [];
            component.selectedChange.subscribe((value) => emitted.push(value));

            clickChip(1);
            fixture.componentRef.setInput('selected', ['b']);
            fixture.detectChanges();

            expect(emitted[0]).toEqual(['b']);
            expect(isChipSelected(0)).toBe(false);
            expect(isChipSelected(1)).toBe(true);
        });
    });

    describe('scrollMode', () => {
        /** スクロールコンテナに幅・スクロール量をモックして scroll イベントを発火する */
        function mockScrollMetrics(metrics: {
            scrollLeft: number;
            clientWidth: number;
            scrollWidth: number;
        }): void {
            const scroller: HTMLElement =
                fixture.nativeElement.querySelector('.tw-overflow-x-auto');
            Object.defineProperty(scroller, 'clientWidth', {
                value: metrics.clientWidth,
                configurable: true,
            });
            Object.defineProperty(scroller, 'scrollWidth', {
                value: metrics.scrollWidth,
                configurable: true,
            });
            Object.defineProperty(scroller, 'scrollLeft', {
                value: metrics.scrollLeft,
                configurable: true,
                writable: true,
            });
            scroller.dispatchEvent(new Event('scroll'));
            fixture.detectChanges();
        }

        beforeEach(() => {
            fixture.componentRef.setInput('scrollMode', true);
            fixture.detectChanges();
        });

        it('チップセットに 1 行表示用の filter-chips-scroll クラスを付与する', () => {
            const listbox: HTMLElement =
                fixture.nativeElement.querySelector('mat-chip-listbox');
            expect(listbox.classList).toContain('filter-chips-scroll');
        });

        it('既定（scrollMode 未指定）では filter-chips-scroll クラスを付与しない（折返し表示を維持）', () => {
            fixture.componentRef.setInput('scrollMode', false);
            fixture.detectChanges();

            const listbox: HTMLElement =
                fixture.nativeElement.querySelector('mat-chip-listbox');
            expect(listbox.classList).not.toContain('filter-chips-scroll');
            expect(
                fixture.nativeElement.querySelector('.filter-chips-arrow'),
            ).toBeNull();
        });

        it('右にはみ出しているときは右矢印のみ表示する', () => {
            mockScrollMetrics({
                scrollLeft: 0,
                clientWidth: 200,
                scrollWidth: 500,
            });

            const arrows = fixture.nativeElement.querySelectorAll(
                '.filter-chips-arrow',
            ) as NodeListOf<HTMLElement>;
            expect(arrows.length).toBe(1);
            expect(arrows[0].textContent).toContain('▶');
        });

        it('中間位置では左右両方の矢印を表示する', () => {
            mockScrollMetrics({
                scrollLeft: 100,
                clientWidth: 200,
                scrollWidth: 500,
            });

            const arrows = fixture.nativeElement.querySelectorAll(
                '.filter-chips-arrow',
            ) as NodeListOf<HTMLElement>;
            expect(arrows.length).toBe(2);
            expect(arrows[0].textContent).toContain('◀');
            expect(arrows[1].textContent).toContain('▶');
        });

        it('右端までスクロールすると左矢印のみ表示する', () => {
            mockScrollMetrics({
                scrollLeft: 300,
                clientWidth: 200,
                scrollWidth: 500,
            });

            const arrows = fixture.nativeElement.querySelectorAll(
                '.filter-chips-arrow',
            ) as NodeListOf<HTMLElement>;
            expect(arrows.length).toBe(1);
            expect(arrows[0].textContent).toContain('◀');
        });

        it('はみ出しが無いときは矢印を表示しない', () => {
            mockScrollMetrics({
                scrollLeft: 0,
                clientWidth: 500,
                scrollWidth: 500,
            });

            expect(
                fixture.nativeElement.querySelector('.filter-chips-arrow'),
            ).toBeNull();
        });

        it('チップ選択の挙動は scrollMode でも変わらない', () => {
            const emitted: unknown[][] = [];
            component.selectedChange.subscribe((value) => emitted.push(value));

            clickChip(0);

            expect(emitted[0]).toEqual(['a']);
        });
    });
});
