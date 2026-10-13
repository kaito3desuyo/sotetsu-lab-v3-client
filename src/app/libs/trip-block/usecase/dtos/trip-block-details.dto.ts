import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

export interface TripBlockDetailsDto {
    tripBlockId: string;

    createdAt?: string;

    updatedAt?: string;

    trips?: TripDetailsDto[];
}
