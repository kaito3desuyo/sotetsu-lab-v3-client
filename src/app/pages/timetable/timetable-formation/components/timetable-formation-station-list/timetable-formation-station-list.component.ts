import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/usecase/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TripLabelComponent } from 'src/app/shared/trip-label/trip-label.component';
import { formatClock } from '../../utils/formation-display.util';
import {
    FormationStationSummary,
    FormationStationVisit,
} from '../../utils/formation-station-filter.util';
import { FormationDateKind } from '../../stores/timetable-formation.store';

/** 駅で絞ったとき。その編成がその日にその駅に来る列車と、通る回数 */
@Component({
    selector: 'app-timetable-formation-station-list',
    templateUrl: './timetable-formation-station-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TripLabelComponent],
    host: { class: 'tw-block' },
})
export class TimetableFormationStationListComponent {
    readonly summary = input<FormationStationSummary | null>(null);
    readonly stationName = input('');
    readonly stationNames = input<Record<string, string>>({});
    readonly calendarId = input<string | undefined>(undefined);
    readonly dateKind = input<FormationDateKind>('today');

    protected direction(trip: TripOperationListDetailsDto): string {
        return (
            tripDirectionLabel.get(
                trip.trip?.tripDirection as ETripDirection,
            ) ?? ''
        );
    }

    protected destination(trip: TripOperationListDetailsDto): string {
        return this.stationNames()[trip.endStationId ?? ''] ?? '';
    }

    protected arrival(visit: FormationStationVisit): string {
        return formatClock(visit.time.arrivalDays, visit.time.arrivalTime);
    }

    protected departure(visit: FormationStationVisit): string {
        return formatClock(visit.time.departureDays, visit.time.departureTime);
    }

    protected link(trip: TripOperationListDetailsDto): readonly unknown[] {
        return [
            '/timetable',
            'all-line',
            {
                calendar_id: this.calendarId(),
                trip_direction: trip.trip?.tripDirection,
                trip_block_id: trip.trip?.tripBlockId,
            },
        ];
    }
}
