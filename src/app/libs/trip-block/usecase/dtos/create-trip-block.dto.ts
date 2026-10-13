import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';

export interface CreateTripBlockDto {
    trips: CreateTripDto[];
}
