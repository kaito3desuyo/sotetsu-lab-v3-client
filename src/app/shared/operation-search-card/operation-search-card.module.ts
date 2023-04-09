import { NgModule } from '@angular/core';
import { OPERATION_SEARCH_CARD_DECLARATIONS } from './operation-search-card.declaration';
import { OPERATION_SEARCH_CARD_PROVIDERS } from './operation-search-card.provider';

@NgModule({
    providers: OPERATION_SEARCH_CARD_PROVIDERS,
    imports: OPERATION_SEARCH_CARD_DECLARATIONS,
    exports: OPERATION_SEARCH_CARD_DECLARATIONS,
})
export class OperationSearchCardModule {}
