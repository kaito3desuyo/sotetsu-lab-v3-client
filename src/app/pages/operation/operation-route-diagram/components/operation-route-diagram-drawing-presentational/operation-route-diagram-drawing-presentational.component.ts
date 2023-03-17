import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

type State = {
    calendar: CalendarDetailsDto;
    operation: OperationDetailsDto;
    stations: StationDetailsDto[];
    tripOperationLists: TripOperationListDetailsDto[];
    inprocessDownloadImage: boolean;
};

@Component({
    selector: 'app-operation-route-diagram-drawing-presentational',
    templateUrl:
        './operation-route-diagram-drawing-presentational.component.html',
    styleUrls: [
        './operation-route-diagram-drawing-presentational.component.scss',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class OperationRouteDiagramDrawingPresentationalComponent {
    readonly vm$ = this.state.select();

    private get _calendar() {
        return this.state.get('calendar');
    }

    private get _operation() {
        return this.state.get('operation');
    }

    readonly onChangedInputCalendar$ = new Subject<CalendarDetailsDto>();
    readonly onChangedInputOperation$ = new Subject<OperationDetailsDto>();
    readonly onChangedInputStations$ = new Subject<StationDetailsDto[]>();
    readonly onChangedInputTripOperationLists$ = new Subject<
        TripOperationListDetailsDto[]
    >();

    readonly onChangedViewChildSvgElement$ = new Subject<ElementRef>();

    @Input() set calendar(calendar: CalendarDetailsDto) {
        this.onChangedInputCalendar$.next(calendar);
    }
    @Input() set operation(operation: OperationDetailsDto) {
        this.onChangedInputOperation$.next(operation);
    }
    @Input() set stations(stations: StationDetailsDto[]) {
        this.onChangedInputStations$.next(stations);
    }
    @Input() set tripOperationLists(
        tripOpeartionLists: TripOperationListDetailsDto[]
    ) {
        this.onChangedInputTripOperationLists$.next(tripOpeartionLists);
    }

    @Output() clickNavigateTimetable: EventEmitter<{
        tripBlockId: string;
        tripDirection: 0 | 1;
    }> = new EventEmitter();

    @ViewChild('svgElement') set svgElement(elRef: ElementRef) {
        if (elRef) {
            this.onChangedViewChildSvgElement$.next(elRef);
        }
    }

    constructor(private readonly state: RxState<State>) {
        this.state.connect(
            'calendar',
            this.onChangedInputCalendar$.asObservable()
        );
        this.state.connect(
            'operation',
            this.onChangedInputOperation$.asObservable()
        );
        this.state.connect(
            'stations',
            this.onChangedInputStations$.asObservable()
        );
        this.state.connect(
            'tripOperationLists',
            this.onChangedInputTripOperationLists$.asObservable()
        );
    }

    navigateTimetable(tripBlockId: string, tripDirection: 0 | 1) {
        this.clickNavigateTimetable.next({
            tripBlockId: tripBlockId,
            tripDirection: tripDirection,
        });
    }

    async downloadAsPng() {
        const name = `${dayjs(this._calendar.startDate, 'YYYY-MM-DD').format(
            'YYYY年MM月DD日'
        )}改正 ${this._calendar.calendarName} ${
            this._operation.operationNumber
        }運 運用行路図`;

        const font =
            "24px -apple-system, BlinkMacSystemFont, Roboto, 'Yu Gothic UI', '游ゴシック体', YuGothic, 'Yu Gothic Medium', sans-serif";

        const color =
            this._calendar.sunday || this._calendar.saturday
                ? 'rgb(217, 83, 79)'
                : 'rgb(66, 139, 202)';

        const getSvgUrl = (svgElementRef: ElementRef) => {
            const svgText = new XMLSerializer().serializeToString(
                svgElementRef.nativeElement
            );
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            const svgUrl = URL.createObjectURL(svgBlob);
            return svgUrl;
        };

        const svgUrlToImageElement = async (svgUrl: string) => {
            const image = new Image();
            image.src = svgUrl;
            await new Promise((resolve) => {
                image.onload = () => {
                    resolve(undefined);
                };
            });
            return image;
        };

        const createCanvasElement = (image: HTMLImageElement) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height + 64 + 16;
            const ctx = canvas.getContext('2d');

            // header
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, image.width, 64);
            ctx.font = font;
            ctx.fillStyle = 'white';
            ctx.fillText(name, 16, 42);

            // base
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 64, image.width, image.height + 64 + 16);

            // svg
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                0,
                64 + 16,
                image.width,
                image.height
            );

            return canvas;
        };

        this.state.set({
            inprocessDownloadImage: true,
        });

        const svgElementRef = await this.onChangedViewChildSvgElement$
            .asObservable()
            .pipe(take(2))
            .toPromise();

        const svgUrl = getSvgUrl(svgElementRef);
        const image = await svgUrlToImageElement(svgUrl);
        URL.revokeObjectURL(svgUrl);
        const canvas = createCanvasElement(image);
        saveAs(canvas.toDataURL(), `${name.replace(/ /g, '_')}.png`);

        this.state.set({
            inprocessDownloadImage: false,
        });
    }
}
