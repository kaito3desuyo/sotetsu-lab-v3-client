import { Exclude, Type } from 'class-transformer';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';

export class CreateTripBlockDto {
    @Exclude()
    tripBlockId: undefined;

    @Type(() => CreateTripDto)
    trips: CreateTripDto[];
}
