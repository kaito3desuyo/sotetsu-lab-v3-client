import { deriveStationViewModes } from './get-view-mode.util';
import { getTime } from './get-time.util';
import { sortTrips } from './sort-trips.util';

export const TimetableAllLineUtil = {
    sortTrips,
    getTime,
    deriveStationViewModes,
} as const;
