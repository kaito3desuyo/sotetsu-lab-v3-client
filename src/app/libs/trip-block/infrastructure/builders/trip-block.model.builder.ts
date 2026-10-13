import { TripModelBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.model.builder';
import { CreateTripBlockDto } from '../../usecase/dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from '../../usecase/dtos/replace-trip-block.dto';

export const TripBlockModelBuilder = {
    buildFromCreateDto: (dto: CreateTripBlockDto) => ({
        trips: dto.trips.map((trip) =>
            TripModelBuilder.buildFromCreateDto(trip),
        ),
    }),
    buildFromReplaceDto: (dto: ReplaceTripBlockDto) => ({
        id: dto.tripBlockId,
        trips: dto.trips.map((trip) =>
            TripModelBuilder.buildFromReplaceDto(trip),
        ),
    }),
} as const;
