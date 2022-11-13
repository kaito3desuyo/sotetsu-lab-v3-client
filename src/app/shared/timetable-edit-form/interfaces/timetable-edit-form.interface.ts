import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';

export type ITimetableEditForm = FormGroup<{
    trips: FormArray<ITimetableEditFormTrip>;
}>;

export type ITimetableEditFormTrip = FormGroup<{
    tripId: FormControl<string | null>;
    serviceId: FormControl<string>;
    tripNumber: FormControl<string>;
    tripClassId: FormControl<string>;
    tripName: FormControl<string | null>;
    tripDirection: FormControl<ETripDirection>;
    tripBlockId: FormControl<string | null>;
    depotIn: FormControl<boolean>;
    depotOut: FormControl<boolean>;
    calendarId: FormControl<string | null>;
    extraCalendarId: FormControl<string | null>;
    times: FormArray<ITimetableEditFormTripTime>;
    operationId: FormControl<string>;
}>;

export type ITimetableEditFormTripTime = FormGroup<{
    timeId: FormControl<string | null>;
    tripId: FormControl<string | null>;
    stationId: FormControl<string>;
    stopId: FormControl<string | null>;
    // stopSequence: FormControl<number | null>;
    stopType: FormControl<ETimetableEditFormStopType>;
    arrivalTime: FormControl<string>;
    departureTime: FormControl<string>;
}>;
