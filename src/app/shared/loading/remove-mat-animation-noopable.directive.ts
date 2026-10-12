import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
    selector: '[appRemoveMatAnimationNoopable]',
})
export class RemoveMatAnimationNoopableDirective implements AfterViewInit {
    readonly #el = inject(ElementRef);

    ngAfterViewInit() {
        this.#el.nativeElement.classList.remove('_mat-animation-noopable');
    }
}
