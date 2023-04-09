import { NgModule } from '@angular/core';
import LIBRARY_LIST_CARD_DECLARATIONS from './library-list-card.declaration';

@NgModule({
    imports: [...LIBRARY_LIST_CARD_DECLARATIONS],
    exports: [...LIBRARY_LIST_CARD_DECLARATIONS],
})
export class LibraryListCardModule {}
