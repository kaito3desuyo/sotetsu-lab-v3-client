import { NgModule } from '@angular/core';
import FORMATION_NUMBER_LINK_DECLARATIONS from './formation-number-link.declaration';

@NgModule({
    imports: [...FORMATION_NUMBER_LINK_DECLARATIONS],
    exports: [...FORMATION_NUMBER_LINK_DECLARATIONS],
})
export class FormationNumberLinkModule {}
