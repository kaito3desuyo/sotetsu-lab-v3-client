import { Provider } from '@angular/core';
import { OperationSearchCardService } from './services/operation-search-card.service';
import {
    OperationSearchCardStateStore,
    OperationSearchCardStateQuery,
} from './states/operation-search-card.state';

const OPERATION_SEARCH_CARD_PROVIDERS: Provider[] = [
    OperationSearchCardService,
    OperationSearchCardStateStore,
    OperationSearchCardStateQuery,
];

export default OPERATION_SEARCH_CARD_PROVIDERS;
