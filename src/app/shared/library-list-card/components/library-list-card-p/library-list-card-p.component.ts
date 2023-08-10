import { RxLet } from '@rx-angular/template/let';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-library-list-card-p',
    templateUrl: './library-list-card-p.component.html',
    styleUrls: ['./library-list-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, RxLet],
})
export class LibraryListCardPComponent {}
