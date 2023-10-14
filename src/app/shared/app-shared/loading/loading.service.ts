import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { LoadingComponent } from './loading.component';

@Injectable({
    providedIn: 'root',
})
export class LoadingService {
    readonly #overlay = inject(Overlay);

    #overlayRef: OverlayRef;

    open() {
        if (!this.#overlayRef) {
            this.#overlayRef = this.#overlay.create({
                hasBackdrop: true,
                positionStrategy: this.#overlay
                    .position()
                    .global()
                    .centerHorizontally()
                    .centerVertically(),
            });
        }

        this.#overlayRef.attach(new ComponentPortal(LoadingComponent));
    }

    close() {
        if (this.#overlayRef) {
            this.#overlayRef.detach();
        }
    }
}
