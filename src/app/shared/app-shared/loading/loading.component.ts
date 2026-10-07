import {
    AfterViewInit,
    Component,
    Directive,
    ElementRef,
    inject,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Directive({
    selector: '[appRemoveMatAnimationNoopable]',
})
export class RemoveMatAnimationNoopableDirective implements AfterViewInit {
    private el = inject(ElementRef);

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
