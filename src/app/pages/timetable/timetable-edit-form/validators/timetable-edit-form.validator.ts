import { FormArray, ValidationErrors } from '@angular/forms';
import { ITimetableEditFormTripTime } from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';
import { findTimeOrderErrors } from '../utils/timetable-edit-form-grid.util';

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
    return findTimeOrderErrors(formArray.getRawValue()).length > 0
        ? { stopTimesShouldBeLaterThanPrevStopTimes: true }
        : null;
};

export const TimetableEditFormValidator = {
    stopsStationCountShouldBeGreaterAndEqualThanTwo,
    stopTimesShouldBeLaterThanPrevStopTimes,
} as const;
