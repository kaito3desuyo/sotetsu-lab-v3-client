export const ETimetableEditFormMode = {
    ADD: 'add',
    COPY: 'copy',
    UPDATE: 'update',
} as const;
export type ETimetableEditFormMode =
    typeof ETimetableEditFormMode[keyof typeof ETimetableEditFormMode];

export const ETimetableEditFormStopType = {
    STOP: 'stop',
    PASS: 'pass',
    NOT_GOING_THROUGH: 'not-going-through',
} as const;
export type ETimetableEditFormStopType =
    typeof ETimetableEditFormStopType[keyof typeof ETimetableEditFormStopType];
