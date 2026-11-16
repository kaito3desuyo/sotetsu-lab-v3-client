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

    it('塊の数を渡さなければ、空き時間には作らない', () => {
        jest.useFakeTimers();
        try {
            jest.advanceTimersByTime(1000);
            expect(host.lazy().built()).toBe(0);
            expect(host.lazy().ready()).toBe(false);
        } finally {
            jest.useRealTimers();
        }
    });
});

@Component({
    selector: 'app-test-steps-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatSelectModule, LazyOptionsDirective],
    template: `
        <mat-select
            [value]="selected"
            appLazyOptions
            [appLazyOptionsSteps]="groups.length"
            #lazy="appLazyOptions"
        >
            @for (
                group of lazy.ready() ? groups : groups.slice(0, lazy.built());
                track $index
            ) {
                @for (item of group; track item) {
                    <mat-option [value]="item">{{ item }}</mat-option>
                }
            }
            @if (!lazy.ready()) {
                <mat-option [value]="selected">{{ selected }}</mat-option>
            }
        </mat-select>
    `,
})
class TestStepsHostComponent {
    readonly groups = [['a', 'b'], ['c'], ['d', 'e']];
    readonly selected = 'd';
    readonly select = viewChild.required(MatSelect);
    readonly lazy = viewChild.required(LazyOptionsDirective);
}

describe('LazyOptionsDirective（空き時間に少しずつ作る）', () => {
    let fixture: ComponentFixture<TestStepsHostComponent>;
    let host: TestStepsHostComponent;

    const values = (): unknown[] => host.select().options.map((o) => o.value);
    // jsdom には requestIdleCallback が無いので、50ms の setTimeout で 1 歩ずつ進む
    const idle = (): void => {
        jest.advanceTimersByTime(50);
        fixture.detectChanges();
    };

    beforeEach(() => {
        jest.useFakeTimers();
        TestBed.configureTestingModule({
            imports: [TestStepsHostComponent, NoopAnimationsModule],
        });
        fixture = TestBed.createComponent(TestStepsHostComponent);
        fixture.detectChanges();
        host = fixture.componentInstance;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('空き時間ごとに塊を 1 つずつ作り、作り終えたら ready になる', () => {
        expect(values()).toEqual(['d']);

        idle();
        expect(host.lazy().built()).toBe(1);
        expect(values()).toEqual(['a', 'b', 'd']);

        idle();
        expect(values()).toEqual(['a', 'b', 'c', 'd']);
        expect(host.lazy().ready()).toBe(false);

        idle();
        expect(host.lazy().ready()).toBe(true);
        expect(values()).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('作っている間も、選んでいる値を表示する', () => {
        idle();
        expect(host.select().triggerValue).toBe('d');
    });

    it('途中で押されたら残りを全部作り、それ以上は進まない', () => {
        idle();
        fixture.debugElement
            .query(By.directive(MatSelect))
            .nativeElement.dispatchEvent(
                new Event('pointerdown', { bubbles: true }),
            );
        fixture.detectChanges();

        expect(values()).toEqual(['a', 'b', 'c', 'd', 'e']);
        idle();
        idle();
        expect(host.lazy().built()).toBe(1);
    });
});
