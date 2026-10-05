import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegmentToggleComponent } from './segment-toggle.component';
import { SegmentToggleOption } from './segment-toggle-option.type';

describe('SegmentToggleComponent', () => {
    let component: SegmentToggleComponent;
    let fixture: ComponentFixture<SegmentToggleComponent>;

    const options: readonly [SegmentToggleOption, SegmentToggleOption] = [
        { value: 'up', label: '上り' },
        { value: 'down', label: '下り' },
    ];

    function buttons(): HTMLButtonElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('button'));
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [SegmentToggleComponent],
        });

        fixture = TestBed.createComponent(SegmentToggleComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('options', options);
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('2セグメント分のボタンを描画する', () => {
        fixture.detectChanges();
        expect(buttons().length).toBe(2);
        expect(buttons()[0].textContent?.trim()).toBe('上り');
        expect(buttons()[1].textContent?.trim()).toBe('下り');
    });

    // mat-button-toggle-group は単一選択時 role="radiogroup" となり、
    // 各トグルボタンは aria-pressed でなく aria-checked で選択状態を表す
    // （Angular Material の構造。Material ラップ差し替えに伴う正当な追随）
    it('value に一致するセグメントを選択状態（aria-checked）にする', () => {
        fixture.componentRef.setInput('value', 'up');
        fixture.detectChanges();

        expect(buttons()[0]).toHaveAttribute('aria-checked', 'true');
        expect(buttons()[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('未選択セグメントをクリックすると valueChange が発火する', () => {
        fixture.componentRef.setInput('value', 'up');
        fixture.detectChanges();

        const emitted: unknown[] = [];
        component.valueChange.subscribe((v) => emitted.push(v));

        buttons()[1].click();

        expect(emitted).toEqual(['down']);
    });

    it('既に選択済みのセグメントをクリックしても valueChange は発火しない', () => {
        fixture.componentRef.setInput('value', 'up');
        fixture.detectChanges();

        const emitted: unknown[] = [];
        component.valueChange.subscribe((v) => emitted.push(v));

        buttons()[0].click();

        expect(emitted.length).toBe(0);
    });

    it('disabled のときはクリックしても valueChange が発火しない', () => {
        fixture.componentRef.setInput('value', 'up');
        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();

        const emitted: unknown[] = [];
        component.valueChange.subscribe((v) => emitted.push(v));

        buttons()[1].click();

        expect(emitted.length).toBe(0);
        expect(buttons()[1].disabled).toBe(true);
    });
});
