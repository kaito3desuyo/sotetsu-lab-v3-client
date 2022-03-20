import dayjs from 'dayjs';
import { get } from 'lodash-es';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';

export function isExistNewerSightings(
    target: OperationSightingDetailsDto,
    array: OperationSightingDetailsDto[],
    path: string
): boolean {
    return array.some((o) => {
        return (
            get(target, path) === get(o, path) &&
            (dayjs(target.sightingTime).isBefore(dayjs(o.sightingTime)) ||
                (dayjs(target.sightingTime).isSame(o.sightingTime) &&
                    dayjs(target.updatedAt).isBefore(dayjs(o.updatedAt))))
        );
    });
}
