import { Expose, Type } from 'class-transformer';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

export class TripBlockDetailsDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripDetailsDto)
    trips?: TripDetailsDto[];
}
