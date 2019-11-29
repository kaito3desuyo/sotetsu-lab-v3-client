import { ReadServiceDto } from './service-dto';
import { IService } from '../../interfaces/service';

export class ServiceModel {
    static readServiceDtoImpl(data: ReadServiceDto): IService {
        const parsed: IService = {
            id: data.id,
            serviceName: data.service_name,
            serviceDescription: data.service_description,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        return parsed;
    }
}
