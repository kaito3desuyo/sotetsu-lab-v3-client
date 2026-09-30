import { FormBuilder } from '@angular/forms';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';
import { TimetableEditFormValidator } from './timetable-edit-form.validator';

const S = ETimetableEditFormStopType;
const fb = new FormBuilder();
const times = (
    rows: Array<[ETimetableEditFormStopType, string | null, string | null]>,
) =>
    fb.array(
        rows.map(([stopType, arrivalTime, departureTime]) =>
            fb.group({ stopType: [stopType], arrivalTime, departureTime }),
        ),
    ) as any;

describe('TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes', () => {
    it('順に並んでいれば null', () => {
        expect(
            TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes(
                times([
                    [S.STOP, null, '10:00'],
                    [S.STOP, '10:05', null],
                ]),
            ),
        ).toBeNull();
    });

    it('時刻の無い通過駅をまたいでも前の駅より早ければ誤り（以前は見逃していた）', () => {
        expect(
            TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes(
                times([
                    [S.STOP, null, '10:10'],
                    [S.PASS, null, null],
                    [S.STOP, '10:05', null],
                ]),
            ),
        ).toEqual({ stopTimesShouldBeLaterThanPrevStopTimes: true });
    });

    it('0 時台は 23 時台より後', () => {
        expect(
            TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes(
                times([
                    [S.STOP, null, '23:58'],
                    [S.STOP, '00:03', null],
                ]),
            ),
        ).toBeNull();
    });
});
