import { Expose, Type } from 'class-transformer';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';

export class ReplaceTripBlockDto {
    @Expose()
    tripBlockId: string;

    @Expose()
    @Type(() => ReplaceTripDto)
    trips: ReplaceTripDto[];
}
