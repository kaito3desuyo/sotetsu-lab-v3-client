import { Expose, Type } from 'class-transformer';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import 'reflect-metadata';

export class TripClassDetailsDto {
    @Expose({ name: 'id' })
    tripClassId: string;

    @Expose()
    serviceId?: string;

    @Expose()
    tripClassName?: string;

    @Expose()
    tripClassColor?: string;

    @Expose()
    sequence?: number;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripDetailsDto)
    trips?: TripDetailsDto[];

    // service?: ServiceMOde;
}
