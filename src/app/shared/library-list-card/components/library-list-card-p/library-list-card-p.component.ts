import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LetModule } from '@rx-angular/template/let';

@Component({
    standalone: true,
    selector: 'app-library-list-card-p',
    templateUrl: './library-list-card-p.component.html',
    styleUrls: ['./library-list-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LetModule],
})
export class LibraryListCardPComponent {}
