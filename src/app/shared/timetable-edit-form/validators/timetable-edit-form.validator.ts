import { FormArray, ValidationErrors } from '@angular/forms';
import dayjs from 'dayjs';
import { ITimetableEditFormTripTime } from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';

const stopsStationCountShouldBeGreaterAndEqualThanTwo = (
    formArray: FormArray<ITimetableEditFormTripTime>,
): ValidationErrors | null => {
    return formArray.value.filter(
        (o) => o.stopType === ETimetableEditFormStopType.STOP,
    ).length < 2
        ? { stopsStationCountShouldBeGreaterAndEqualThanTwo: true }
        : null;
};

const stopTimesShouldBeLaterThanPrevStopTimes = (
    formArray: FormArray<ITimetableEditFormTripTime>,
): ValidationErrors | null => {
    let valid = true;

    const toDayjs = (time: string) => {
        const today = dayjs().format('YYYY-MM-DD');
        return dayjs(today + ' ' + time, 'YYYY-MM-DD HH:mm').add(
            dayjs(today + ' ' + time, 'YYYY-MM-DD HH:mm').hour() < 4 ? 1 : 0,
            'day',
        );
    };

    let prevArraivalTime = null;
    let prevDepartureTime = null;

    for (let index = 0; index < formArray.controls.length; index++) {
        const control = formArray.at(index);

        const stopType = control.get('stopType').value;
        const arraivalTime = control.get('arrivalTime').value;
        const departureTime = control.get('departureTime').value;

        if (stopType === ETimetableEditFormStopType.NOT_GOING_THROUGH) {
            continue;
        }

        if (
            (prevArraivalTime || prevDepartureTime) &&
            (arraivalTime || departureTime)
        ) {
            const prev = prevDepartureTime ?? prevArraivalTime;
            const current = arraivalTime ?? departureTime;

            if (toDayjs(prev) > toDayjs(current)) {
                valid = false;
                break;
            }
        }

        prevArraivalTime = arraivalTime;
        prevDepartureTime = departureTime;
    }

    return !valid ? { stopTimesShouldBeLaterThanPrevStopTimes: true } : null;
};

export const TimetableEditFormValidator = {
    stopsStationCountShouldBeGreaterAndEqualThanTwo,
    stopTimesShouldBeLaterThanPrevStopTimes,
} as const;
