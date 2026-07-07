import { ETimetableEditFormStopType } from '../enums/timetable-edit-form.enum';

export const timetableEditFormStopTypeLabel = new Map<
    ETimetableEditFormStopType,
    string
>([
    [ETimetableEditFormStopType.STOP, '停'],
    [ETimetableEditFormStopType.PASS, '通'],
    [ETimetableEditFormStopType.NOT_GOING_THROUGH, '経由なし'],
]);
