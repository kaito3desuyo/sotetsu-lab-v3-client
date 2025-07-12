import { AfterViewInit, Component, Directive, ElementRef } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Directive({
    selector: '[RemoveMatAnimationNoopable]',
})
export class RemoveMatAnimationNoopableDirective implements AfterViewInit {
    constructor(private el: ElementRef) {}

    ngAfterViewInit() {
        this.el.nativeElement.classList.remove('_mat-animation-noopable');
    }
}

@Component({
    selector: 'app-loading',
    templateUrl: './loading.component.html',
    styleUrls: ['./loading.component.scss'],
    imports: [MatProgressSpinnerModule, RemoveMatAnimationNoopableDirective],
})
export class LoadingComponent {}
