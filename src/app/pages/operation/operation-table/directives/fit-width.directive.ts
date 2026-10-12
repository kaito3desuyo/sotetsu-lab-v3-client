import {
    afterNextRender,
    DestroyRef,
    Directive,
    ElementRef,
    inject,
    input,
} from '@angular/core';

/**
 * 親の幅に入らないときだけ、要素を横に縮めて入れる（駅名の 3 文字幅と同じ考え方）。
 * 縮めた幅を要素の幅にするので、隣の矢印線は残りの幅を取る。
 */
@Directive({
    selector: '[appFitWidth]',
})
export class FitWidthDirective {
    readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** 親の幅のうち、この要素に使わせない幅（隣の矢印じりと隙間） */
    readonly appFitWidthReserve = input(0);

    constructor() {
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const host = this.#host.nativeElement;
            const parent = host.parentElement;
            if (!parent || typeof ResizeObserver === 'undefined') return;
            const observer = new ResizeObserver(() => this.#fit(host, parent));
            observer.observe(parent);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    #fit(host: HTMLElement, parent: HTMLElement): void {
        host.style.width = '';
        host.style.transform = '';
        const natural = host.scrollWidth;
        const available = parent.clientWidth - this.appFitWidthReserve();
        if (natural <= 0 || natural <= available) return;
        const scale = Math.max(available, 0) / natural;
        host.style.width = `${natural * scale}px`;
        host.style.transformOrigin = 'left center';
        host.style.transform = `scaleX(${scale})`;
    }
}
