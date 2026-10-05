import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { PanelCardComponent } from '../../../panel-card/panel-card.component';

@Component({
    selector: 'app-library-list-card-p',
    templateUrl: './library-list-card-p.component.html',
    styleUrls: ['./library-list-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MatIconModule, MatListModule, PanelCardComponent]
})
export class LibraryListCardPComponent {}
