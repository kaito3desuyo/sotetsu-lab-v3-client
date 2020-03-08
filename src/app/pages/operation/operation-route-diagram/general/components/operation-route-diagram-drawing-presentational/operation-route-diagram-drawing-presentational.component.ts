import {
    Component,
    ChangeDetectionStrategy,
    Input,
    Output,
    EventEmitter,
    ViewChild,
    ElementRef,
    SimpleChanges,
    ChangeDetectorRef,
    OnChanges
} from '@angular/core';
import { IStation } from 'src/app/general/interfaces/station';
import { ITripOperationList } from 'src/app/general/interfaces/trip-operation-list';
import { findIndex } from 'lodash-es';
import moment from 'moment';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { Router } from '@angular/router';
import { IOperation } from 'src/app/general/interfaces/operation';

@Component({
    selector: 'app-operation-route-diagram-drawing-presentational',
    templateUrl:
        './operation-route-diagram-drawing-presentational.component.html',
    styleUrls: [
        './operation-route-diagram-drawing-presentational.component.scss'
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationRouteDiagramDrawingPresentationalComponent
    implements OnChanges {
    @Input() stations: IStation[];
    @Input() tripOperationLists: ITripOperationList[];
    @Input() calendar: ICalendar;
    @Input() operation: IOperation;
    @Output() clickNavigateTimetable: EventEmitter<{
        tripBlockId: string;
        tripDirection: 0 | 1;
    }> = new EventEmitter();

    @ViewChild('svgElement') svgElement: ElementRef;

    visible = true;

    constructor(private cd: ChangeDetectorRef, private router: Router) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.tripOperationLists) {
            this.visible = false;
            this.cd.detectChanges();
            this.visible = true;
            this.cd.detectChanges();
        }
    }

    returnTimeString(str: string) {
        return moment(str, 'HH:mm:ss').format('HHmm');
    }

    returnStationIndex(id: string) {
        return findIndex(this.stations, obj => {
            return obj.id === id;
        });
    }

    navigateTimetable(tripBlockId: string, tripDirection: 0 | 1) {
        this.router.navigate([
            'timetable',
            this.calendar.id,
            'all-line',
            { trip_direction: tripDirection, trip_block_id: tripBlockId }
        ]);
    }

    svgToPng() {
        const canvas = document.createElement('canvas');
        canvas.width = this.svgElement.nativeElement.width.baseVal.value;
        canvas.height =
            this.svgElement.nativeElement.height.baseVal.value + 64 + 16;
        const ctx = canvas.getContext('2d');
        const image = new Image();

        image.onload = () => {
            // SVGデータをPNG形式に変換する
            ctx.fillStyle =
                this.calendar.sunday || this.calendar.saturday
                    ? 'rgb(217, 83, 79)'
                    : 'rgb(66, 139, 202)';
            ctx.fillRect(0, 0, image.width, 64);

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 64, image.width, 16);

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

            ctx.font = `24px -apple-system, BlinkMacSystemFont, Roboto, 'Yu Gothic UI', '游ゴシック体', YuGothic, 'Yu Gothic Medium', sans-serif`;
            ctx.fillStyle = 'white';
            ctx.fillText(
                `${moment(this.calendar.startDate, 'YYYY-MM-DD').format(
                    'YYYY年MM月DD日'
                )}改正 ${this.calendar.calendarName} ${
                    this.tripOperationLists[0].operation.operationNumber
                }運 運用行路図`,
                16,
                42
            );

            const dataUrl = canvas.toDataURL();
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download =
                moment(this.calendar.startDate, 'YYYY-MM-DD').format(
                    'YYYY年MM月DD日'
                ) +
                '改正' +
                '_' +
                this.calendar.calendarName +
                '_' +
                this.tripOperationLists[0].operation.operationNumber +
                '運' +
                '_' +
                '運用行路図.png';
            link.click();
        };
        image.onerror = e => {
            console.error(e);
        };
        // SVGデータを取り出す
        const svgData = new XMLSerializer().serializeToString(
            this.svgElement.nativeElement
        );
        image.src =
            'data:image/svg+xml;charset=utf-8;base64,' +
            btoa(unescape(encodeURIComponent(svgData)));
    }
}
