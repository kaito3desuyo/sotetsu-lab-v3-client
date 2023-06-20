import { NgModule } from '@angular/core';
import CURRENT_POSITION_LINK_DECLARATIONS from './current-position-link.declaration';

@NgModule({
    imports: [...CURRENT_POSITION_LINK_DECLARATIONS],
    exports: [...CURRENT_POSITION_LINK_DECLARATIONS],
})
export class CurrentPositionLinkModule {}
