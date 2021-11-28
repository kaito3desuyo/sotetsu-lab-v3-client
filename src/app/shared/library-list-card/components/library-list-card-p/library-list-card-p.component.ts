import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-library-list-card-p',
    templateUrl: './library-list-card-p.component.html',
    styleUrls: ['./library-list-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryListCardPComponent {
    constructor() {}
}
