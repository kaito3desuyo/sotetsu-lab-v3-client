import { NgModule } from '@angular/core';
import OPERATION_POST_CARD_DECLARATIONS from './operation-post-card.declaration';
import OPERATION_POST_CARD_PROVIDERS from './operation-post-card.provider';

@NgModule({
    providers: [...OPERATION_POST_CARD_PROVIDERS],
    imports: [...OPERATION_POST_CARD_DECLARATIONS],
    exports: [...OPERATION_POST_CARD_DECLARATIONS],
})
export class OperationPostCardModule {}
