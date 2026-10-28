import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LazyOptionsDirective } from './lazy-options.directive';

@Component({
    selector: 'app-test-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatSelectModule, LazyOptionsDirective],
    template: `
        <mat-select [value]="selected" appLazyOptions #lazy="appLazyOptions">
            @if (lazy.ready()) {
                @for (item of items; track item) {
                    <mat-option [value]="item">{{ item }}</mat-option>
                }
            } @else {
                <mat-option [value]="selected">{{ selected }}</mat-option>
            }
        </mat-select>
    `,
})
class TestHostComponent {
    readonly items = ['a', 'b', 'c', 'd'];
    readonly selected = 'b';
    readonly select = viewChild.required(MatSelect);
    readonly lazy = viewChild.required(LazyOptionsDirective);
}

describe('LazyOptionsDirective', () => {
    let fixture: ComponentFixture<TestHostComponent>;
    let host: TestHostComponent;
    let selectElement: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TestHostComponent, NoopAnimationsModule],
        });
        fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();
        host = fixture.componentInstance;
        selectElement = fixture.debugElement.query(
            By.directive(MatSelect),
        ).nativeElement;
    });

    it('最初は false', () => {
        expect(host.lazy().ready()).toBe(false);
    });

    it('focusin で true になる', () => {
        selectElement.dispatchEvent(new Event('focusin', { bubbles: true }));

        expect(host.lazy().ready()).toBe(true);
    });

    it('pointerdown で true になる', () => {
        selectElement.dispatchEvent(
            new Event('pointerdown', { bubbles: true }),
        );

        expect(host.lazy().ready()).toBe(true);
    });

    it('一度 true になったら戻らない', () => {
        selectElement.dispatchEvent(new Event('focusin', { bubbles: true }));
        selectElement.dispatchEvent(new Event('focusout', { bubbles: true }));
        selectElement.dispatchEvent(
            new Event('pointerdown', { bubbles: true }),
        );

        expect(host.lazy().ready()).toBe(true);
    });

    it('ready の前は選んでいる 1 つだけ、後は全部の mat-option が options に入る', () => {
        expect(host.select().options.map((o) => o.value)).toEqual(['b']);

        selectElement.dispatchEvent(
            new Event('pointerdown', { bubbles: true }),
        );
        fixture.detectChanges();

        expect(host.select().options.map((o) => o.value)).toEqual([
            'a',
            'b',
            'c',
            'd',
        ]);
    });

    it('ready の前も選んでいる値を表示する', () => {
        expect(host.select().triggerValue).toBe('b');
    });
});
