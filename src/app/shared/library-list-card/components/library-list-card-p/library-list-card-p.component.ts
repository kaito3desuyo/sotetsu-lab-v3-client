import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-library-list-card-p',
    templateUrl: './library-list-card-p.component.html',
    styleUrls: ['./library-list-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink]
})
export class LibraryListCardPComponent {}
