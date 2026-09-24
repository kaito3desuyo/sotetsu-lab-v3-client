import { getBorderSetting } from './get-border-setting.util';
import { getTime } from './get-time.util';
import { getViewMode } from './get-view-mode.util';
import { sortTrips } from './sort-trips.util';

export const TimetableAllLineUtil = {
    sortTrips,
    getTime,
    getViewMode,
    getBorderSetting,
} as const;
