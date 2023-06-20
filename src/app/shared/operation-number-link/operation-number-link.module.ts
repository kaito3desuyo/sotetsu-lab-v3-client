import { NgModule } from '@angular/core';
import OPERATION_NUMBER_LINK_DECLARATIONS from './operation-number-link.declaration';

@NgModule({
    imports: [...OPERATION_NUMBER_LINK_DECLARATIONS],
    exports: [...OPERATION_NUMBER_LINK_DECLARATIONS],
})
export class OperationNumberLinkModule {}
