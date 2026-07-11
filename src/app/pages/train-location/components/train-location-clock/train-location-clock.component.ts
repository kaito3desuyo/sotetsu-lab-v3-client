import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TrainLocationMode } from '../../stores/train-location.store';

/**
 * 時計バー（5.8）: 等幅数字の大きな時計（現在時刻 or 指定時刻）+ モード説明。
 * 時刻指定モードでは `<input type="time">`（mat-timepicker 相当のピッカー）を
 * mat-form-field でラップして表示し、操作部の Material デザインに揃える。
 */
@Component({
    selector: 'app-train-location-clock',
    templateUrl: './train-location-clock.component.html',
    styleUrl: './train-location-clock.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, MatFormFieldModule, MatInputModule],
    host: { class: 'tw-block' },
})
export class TrainLocationClockComponent {
    readonly mode = input<TrainLocationMode>('now');
    readonly clockText = input<string>('--:--:--');
    readonly timeInputValue = input<string>('00:00');

    readonly timeInputValueChange = output<string>();

    readonly description = computed(() =>
        this.mode() === 'now'
            ? '現在時刻に追従中（10秒ごとに再計算）'
            : '指定時刻で静止表示中',
    );

    onTimeInputChange(value: string): void {
        this.timeInputValueChange.emit(value);
    }
}
