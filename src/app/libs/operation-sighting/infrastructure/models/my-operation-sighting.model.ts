import { SightingCorroboration } from '../../usecase/dtos/my-operation-sighting.dto';
import { OperationSightingSummaryModel } from './operation-sighting-summary.model';

export interface MyOperationSightingModel extends OperationSightingSummaryModel {
    corroboration: SightingCorroboration;
}
