import '@testing-library/jest-dom';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FitWidthDirective } from './fit-width.directive';

@Component({
    imports: [FitWidthDirective],
    template: `<div id="parent">
        <span id="host" appFitWidth [appFitWidthReserve]="20"
            >各駅停車 A1812K2</span
        >
    </div>`,
})
class HostComponent {}

describe('FitWidthDirective', () => {
    let callback: (() => void) | undefined;

    beforeEach(() => {
        (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
            constructor(cb: () => void) {
                callback = cb;
            }
            observe(): void {}
            disconnect(): void {}
        };
    });

    afterEach(() => {
        delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
    });

    function setup(natural: number, parentWidth: number): HTMLElement {
        const fixture = TestBed.createComponent(HostComponent);
        const el: HTMLElement = fixture.nativeElement;
        const host = el.querySelector<HTMLElement>('#host')!;
        const parent = el.querySelector<HTMLElement>('#parent')!;
        Object.defineProperty(host, 'scrollWidth', { value: natural });
        Object.defineProperty(parent, 'clientWidth', { value: parentWidth });
        fixture.detectChanges();
        TestBed.tick();
        callback?.();
        return host;
    }

    it('入らないときは、入る幅まで横に縮める', () => {
        const host = setup(120, 120);

        // 使える幅 = 120 - 20 = 100
        expect(host).toHaveStyle({
            width: '100px',
            transform: `scaleX(${100 / 120})`,
        });
    });

    it('入るときは縮めない', () => {
        const host = setup(80, 120);

        expect(host.getAttribute('style') ?? '').not.toContain('scaleX');
    });
});
