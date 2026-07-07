import { Pipe, PipeTransform } from '@angular/core';

/**
 * 運用表: 長い駅名を短縮表示する（B4・縦カード刷新に伴い、旧固定幅テーブルの
 * scaleX 縮小表示用だった 2 文字駅名への全角スペース挿入は廃止した。
 * 情報要素としての駅名短縮マップのみ維持する）。
 */
@Pipe({
    standalone: true,
    name: 'operationTableFormatStationName',
})
export class OperationTableFormatStationNamePipe implements PipeTransform {
    transform(stationName: string): string {
        if (!stationName) {
            return '';
        }

        if (stationNameMap.has(stationName)) {
            return stationNameMap.get(stationName);
        }

        return stationName;
    }
}

const stationNameMap = new Map<string, string>([
    ['羽沢横浜国大', '羽沢横国'],
    ['元町・中華街', '元町中華'],
]);
