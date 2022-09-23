import {
    Component,
    Input,
    ChangeDetectionStrategy,
    Inject,
    Injector,
    OnInit,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { UntypedFormControl, UntypedFormBuilder } from '@angular/forms';
import { Observable, BehaviorSubject } from 'rxjs';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
    selector: 'app-sidenav-presentational',
    templateUrl: './sidenav-presentational.component.html',
    styleUrls: ['./sidenav-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavPresentationalComponent extends BaseComponent
    implements OnInit, OnChanges {
    stationId: UntypedFormControl = this.fb.control('');
    upTimetableLink: BehaviorSubject<
        [string, { [key: string]: any }]
    > = new BehaviorSubject<[string, { [key: string]: any }]>(null);
    downTimetableLink: BehaviorSubject<
        [string, { [key: string]: any }]
    > = new BehaviorSubject<[string, { [key: string]: any }]>(null);

    @Input() todaysCalendarId: string;
    @Input() stationsSelectList: {
        routeName: string;
        stations: { label: string; value: string }[];
    }[];

    constructor(@Inject(Injector) injector: Injector, private fb: UntypedFormBuilder) {
        super(injector);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.todaysCalendarId) {
            this.upTimetableLink.next([
                '/timetable/all-line',
                { calendar_id: this.todaysCalendarId, trip_direction: '0' },
            ]);
            this.downTimetableLink.next([
                '/timetable/all-line',
                { calendar_id: this.todaysCalendarId, trip_direction: '1' },
            ]);
        }
    }

    ngOnInit(): void {
        this.subscription = this.stationId.valueChanges.subscribe((id) => {
            if (id) {
                this.upTimetableLink.next([
                    '/timetable/station',
                    { calendar_id: this.todaysCalendarId, trip_direction: '0', station_id: id },
                ]);
                this.downTimetableLink.next([
                    '/timetable/station',
                    { calendar_id: this.todaysCalendarId, trip_direction: '1', station_id: id },
                ]);
            } else {
                this.upTimetableLink.next([
                    '/timetable/all-line',
                    { calendar_id: this.todaysCalendarId, trip_direction: '0' },
                ]);
                this.downTimetableLink.next([
                    '/timetable/all-line',
                    { calendar_id: this.todaysCalendarId, trip_direction: '1' },
                ]);
            }
        });
    }
}
