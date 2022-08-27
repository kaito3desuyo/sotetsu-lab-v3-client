import { Expose } from 'class-transformer';

export class ServiceDetailsDto {
    @Expose({ name: 'id' })
    serviceId: string;

    @Expose()
    serviceName: string;

    @Expose()
    serviceDescription: string;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;
}
