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

        it('先頭に ● マーカーを表示する', () => {
            const text: string = fixture.nativeElement.textContent;
            expect(text).toContain('●');
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
});
