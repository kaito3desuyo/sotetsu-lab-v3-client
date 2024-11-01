import { Expose, Type } from 'class-transformer';
import { TripDetailsDto } from './trip-details.dto';
import 'reflect-metadata';

export class TripBlockDetailsDto {
    @Expose({ name: 'id' })
    tripBlockId: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripDetailsDto)
    trips?: TripDetailsDto[];
}
