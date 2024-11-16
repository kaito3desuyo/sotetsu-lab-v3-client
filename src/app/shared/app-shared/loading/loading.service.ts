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
                backdropClass: [
                    'tw-bg-white',
                    'tw-bg-opacity-20',
                    'tw-backdrop-blur-sm',
                ],
                positionStrategy: this.#overlay
                    .position()
                    .global()
                    .centerHorizontally()
                    .centerVertically(),
            });
        }

        if (!this.#overlayRef.hasAttached()) {
            this.#overlayRef.attach(new ComponentPortal(LoadingComponent));
        }
    }

    close() {
        if (this.#overlayRef) {
            this.#overlayRef.detach();
        }
    }
}
