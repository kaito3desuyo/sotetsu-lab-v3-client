import { Pipe, PipeTransform } from '@angular/core';
import { shortTripClassName } from '../trip-class-short-name.util';

/**
 * 種別名を短縮表示名に整形するパイプ（98 §G5・mockup-05 の種別行）。
 * 例: `各駅停車` → `各停` / `特急（SO→TY）` → `特急`。
 *
 * 適用範囲は極小セル（全線時刻表の種別行等）のみ。select ボックス等の
 * 選択肢は正式名を維持する（確定済みユーザー判断）。
 */
@Pipe({
    standalone: true,
    name: 'tripClassShortName',
})
export class TripClassShortNamePipe implements PipeTransform {
    transform(tripClassName: string | null | undefined): string {
        return shortTripClassName(tripClassName);
    }
}
