import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';
import { TripBlockDtoBuilder } from './trip-block.dto.builder';

describe('TripBlockDtoBuilder', () => {
    // API の応答と同じ形の素の JSON（入れ子の列車・時刻・運用・種別と、DTO に無い項目を含む）
    const model = JSON.parse(
        JSON.stringify({
            id: 'block-1',
            createdAt: '2026-03-14T00:00:00.000Z',
            unknownField: 'x',
            trips: [
                {
                    id: 'trip-1',
                    tripNumber: '6400',
                    tripClassId: 'class-1',
                    tripDirection: 0,
                    tripBlockId: 'block-1',
                    calendarId: 'cal-1',
                    depotIn: false,
                    extraField: 1,
                    times: [
                        {
                            id: 'time-1',
                            stationId: 'st-1',
                            stopSequence: 1,
                            arrivalTime: null,
                            departureTime: '05:00:00',
                            departureDays: 1,
                            pickupType: 0,
                            dropoffType: 1,
                        },
                    ],
                    tripOperationLists: [
                        {
                            id: 'tol-1',
                            operationId: 'op-1',
                            operation: { id: 'op-1', operationNumber: '58K' },
                        },
                    ],
                    tripClass: {
                        id: 'class-1',
                        tripClassName: '各停',
                        tripClassColor: '#ff0000',
                    },
                },
            ],
        }),
    ) as TripBlockModel;

    it('素の JSON から、以前の 2 段変換（classToPlain → plainToClass）と同じ DTO を作る', () => {
        const before = plainToClass(
            TripBlockDetailsDto,
            classToPlain(model, classTransformerOptions),
            classTransformerOptions,
        );

        const after = TripBlockDtoBuilder.buildFromModel(model);

        expect(after).toEqual(before);
        expect(after).toBeInstanceOf(TripBlockDetailsDto);
        expect(after.trips[0].tripClass.tripClassName).toBe('各停');
        expect(after.trips[0].times[0].departureTime).toBe('05:00:00');
        expect(
            after.trips[0].tripOperationLists[0].operation.operationNumber,
        ).toBe('58K');
    });
});
