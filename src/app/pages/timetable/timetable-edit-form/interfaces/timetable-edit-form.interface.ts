import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
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

/** 1 列車ぶんのフォームの値（下書きに保存する形） */
export type ITimetableEditFormTripValue = ReturnType<
    ITimetableEditFormTrip['getRawValue']
>;

export type ITimetableEditFormTripTime = FormGroup<{
    timeId: FormControl<string | null>;
    tripId: FormControl<string | null>;
    stationId: FormControl<string>;
    stopId: FormControl<string | null>;
    stopType: FormControl<ETimetableEditFormStopType>;
    arrivalTime: FormControl<string>;
    departureTime: FormControl<string>;
}>;

export type TimetableEditFormTimeField = 'arrivalTime' | 'departureTime';

/** 格子の判定に使う 1 駅ぶんの値（times の getRawValue() と同じ形） */
export interface ITimetableEditFormTimeValue {
    stopType: ETimetableEditFormStopType;
    arrivalTime: string | null;
    departureTime: string | null;
}

/** 前の駅より早い時刻。index / prevIndex は times（= 全駅）の位置 */
export interface ITimetableEditFormTimeOrderError {
    index: number;
    field: TimetableEditFormTimeField;
    time: string;
    prevIndex: number;
    prevTime: string;
}

/** 路線をたどれない隣り合う 2 駅。index / prevIndex は times（= 全駅）の位置 */
export interface ITimetableEditFormRouteError {
    index: number;
    prevIndex: number;
}

export interface ITimetableEditFormGridTimeCell {
    /**
     * 表示する 'HH:mm'。灰色のセルは null（空文字と分けておくと、打った直後に
     * 灰色へ戻ったときも [value] が変わったと見なされて入力欄が空に戻る）
     */
    value: string | null;
    /** 始発の着・終着の発。打てない */
    disabled: boolean;
    /** 灰色の地。disabled か ‖ の駅（‖ は打てて、打つと停になる） */
    muted: boolean;
    error: boolean;
    label: string;
}

export interface ITimetableEditFormGridCell {
    /** times（= 全駅）の位置 */
    timeIndex: number;
    stopType: ETimetableEditFormStopType;
    mark: string;
    label: string;
    /** 前後の駅と路線をたどれない（分岐をまたいでいる）。注意だけで保存は止めない */
    routeError: boolean;
    arrivalTime: ITimetableEditFormGridTimeCell;
    departureTime: ITimetableEditFormGridTimeCell;
}

export interface ITimetableEditFormGridTripView {
    tripIndex: number;
    tripForm: ITimetableEditFormTrip;
    tripNumber: string;
    destination: string;
    tripClass: TripClassDetailsDto | undefined;
    /** visibleStations と同じ並び */
    cells: ITimetableEditFormGridCell[];
    messages: string[];
}
