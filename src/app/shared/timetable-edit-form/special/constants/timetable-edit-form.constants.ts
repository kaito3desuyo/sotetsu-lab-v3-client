import { ETimetableEditFormStopType } from '../enums/timetable-edit-form.enum';

export const timetableEditFormStopTypeLabel = new Map<
    ETimetableEditFormStopType,
    string
>([
    [ETimetableEditFormStopType.STOP, '停車'],
    [ETimetableEditFormStopType.PASS, '通過'],
    [ETimetableEditFormStopType.NOT_GOING_THROUGH, '経由しない'],
]);
