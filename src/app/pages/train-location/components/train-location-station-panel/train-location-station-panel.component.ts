import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { TripLabelComponent } from 'src/app/shared/trip-label/trip-label.component';
import {
    StationArrival,
    StationArrivals,
} from '../../interfaces/station-arrival.interface';
import { TrainLocationInterchangeRoute } from '../../interfaces/train-location-row.interface';
import {
    readStationPanelOpen,
    writeStationPanelOpen,
} from '../../utils/train-location-storage.util';

/**
 * 駅の欄: 選んだ駅に次に来る列車を上り・下りに分けて出す（spec「駅の欄」）。
 * PC（lg 以上）は常に開き、スマホは見出しのボタンで畳める（開閉は端末に覚える）。
 */
@Component({
    selector: 'app-train-location-station-panel',
    templateUrl: './train-location-station-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, TripLabelComponent, NgTemplateOutlet, PipesModule],
    host: { class: 'tw-block' },
})
export class TrainLocationStationPanelComponent {
    readonly stationId = input<string | null>(null);
    readonly stationName = input<string>('');
    readonly interchangeRoutes = input<TrainLocationInterchangeRoute[]>([]);
    readonly arrivals = input<StationArrivals>({ inbound: [], outbound: [] });

    readonly isOpen = signal(readStationPanelOpen());

    toggle(): void {
        const next = !this.isOpen();
        this.isOpen.set(next);
        writeStationPanelOpen(next);
    }

    /**
     * 主の段に出す種別・列番。種別が変わる駅を選んでいるとき（continuation があるとき）は変更後を出し、
     * 変更前は上の段に出す。それ以外の駅では continuation が無いので変更前（ユーザー指示 2026-09-26）
     */
    shown(arrival: StationArrival): {
        tripClassName: string;
        tripClassColor: string;
        tripNumber: string;
    } {
        return arrival.continuation ?? arrival;
    }

    minutesLabel(arrival: StationArrival): string {
        if (arrival.isStopped) return '停車中';
        if (arrival.minutesUntil < 1) return 'まもなく';
        return `${Math.floor(arrival.minutesUntil)}分`;
    }

    timeLabel(arrival: StationArrival): string {
        return format(arrival.time, 'HH:mm') + (arrival.isPassing ? '頃' : '');
    }

    /** あと何分ラベル（Math.floor）が「2分」以下になる行は淡い accent の地にする */
    departureLabel(arrival: StationArrival): string {
        return arrival.departureTime
            ? format(arrival.departureTime, 'HH:mm')
            : '';
    }

    isImminent(arrival: StationArrival): boolean {
        return arrival.minutesUntil < 3;
    }
}
