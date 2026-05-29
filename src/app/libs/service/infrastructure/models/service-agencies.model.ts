import { AgencyModel } from 'src/app/libs/agency/infrastructure/models/agency.model';
import { ServiceModel } from './service.model';

export interface ServiceAgenciesModel {
    service: ServiceModel;
    agencies: AgencyModel[];
}
