import { CreateTimeDto } from '../../usecase/dtos/create-time.dto';
import { ReplaceTimeDto } from '../../usecase/dtos/replace-time.dto';

export const TimeModelBuilder = {
    buildFromCreateDto: (dto: CreateTimeDto) => ({
        stationId: dto.stationId,
        stopId: dto.stopId,
        stopSequence: dto.stopSequence,
        pickupType: dto.pickupType,
        dropoffType: dto.dropoffType,
        arrivalDays: dto.arrivalDays,
        arrivalTime: dto.arrivalTime,
        departureDays: dto.departureDays,
        departureTime: dto.departureTime,
    }),
    buildFromReplaceDto: (dto: ReplaceTimeDto) => ({
        id: dto.timeId,
        ...TimeModelBuilder.buildFromCreateDto(dto),
    }),
} as const;
