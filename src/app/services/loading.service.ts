import { Injectable } from '@angular/core';
import { OverlayRef, Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { LoadingComponent } from '../components/accessories/loading/loading.component';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  overlayRef: OverlayRef;

  constructor(private overlay: Overlay) {}

  open() {
    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      positionStrategy: this.overlay
        .position()
        .global()
        .centerHorizontally()
        .centerVertically()
    });
    this.overlayRef.attach(new ComponentPortal(LoadingComponent));
  }

  close() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
    }
  }
}
