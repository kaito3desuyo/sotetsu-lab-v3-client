import { Pipe, PipeTransform } from '@angular/core';
import { baseTripClassName } from '../trip-class-base-name.util';

/**
 * 種別名から系統サフィックス「（…）」を除いたベース種別名に整形する表示用パイプ。
 * 例: `特急（SO→TY）` → `特急`。
 *
 * 系統付きの正式名はセレクトボックスの選択肢でのみ用い、カード・時刻表・凡例など
 * 通常の表示ではこのパイプを通す（ユーザー指示 2026-07-08）。
 */
@Pipe({
    standalone: true,
    name: 'tripClassBaseName',
})
export class TripClassBaseNamePipe implements PipeTransform {
    transform(tripClassName: string | null | undefined): string {
        return baseTripClassName(tripClassName);
    }
}
