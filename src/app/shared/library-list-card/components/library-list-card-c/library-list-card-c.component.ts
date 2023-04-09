import { Component } from '@angular/core';
import { LibraryListCardPComponent } from '../library-list-card-p/library-list-card-p.component';

@Component({
    standalone: true,
    selector: 'app-library-list-card-c',
    templateUrl: './library-list-card-c.component.html',
    styleUrls: ['./library-list-card-c.component.scss'],
    imports: [LibraryListCardPComponent],
})
export class LibraryListCardCComponent {}
