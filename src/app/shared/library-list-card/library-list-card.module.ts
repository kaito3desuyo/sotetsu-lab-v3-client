import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LibraryListCardCComponent } from './components/library-list-card-c/library-list-card-c.component';
import { LibraryListCardPComponent } from './components/library-list-card-p/library-list-card-p.component';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';

@NgModule({
    declarations: [LibraryListCardCComponent, LibraryListCardPComponent],
    imports: [
        CommonModule,
        RouterModule,
        FlexLayoutModule,
        MatCardModule,
        MatListModule,
    ],
    exports: [LibraryListCardCComponent],
})
export class LibraryListCardModule {}
