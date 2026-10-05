import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

type QuickTile = {
    icon: string;
    title: string;
    subtitle: string;
    link: string[];
    accent: boolean;
};

/**
 * クイックタイル 4 枚（N3・07-03 指定順）。
 * 左上=リアルタイム運用情報 / 右上=列車位置情報 / 左下=駅別時刻表 / 右下=ダイヤグラム。
 * mockup-11（G10）では 4 枚中 1 枚（列車位置情報）のみオレンジ塗りのアクセント、
 * 残り 3 枚は紺塗り。背景にミニダイヤの斜線を敷く。
 *
 * 列車位置情報（/train-location）・ダイヤグラム（/train-diagram）へ遷移する。
 */
@Component({
    selector: 'app-dashboard-quick-tiles',
    templateUrl: './dashboard-quick-tiles.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MatIconModule],
})
export class DashboardQuickTilesComponent {
    readonly tiles: QuickTile[] = [
        {
            icon: 'sensors',
            title: 'リアルタイム運用情報',
            subtitle: '目撃ベースの実在線',
            link: ['/operation', 'real-time'],
            accent: false,
        },
        {
            icon: 'my_location',
            title: '列車位置情報',
            subtitle: 'いまどこを走っているか',
            link: ['/train-location'],
            accent: true,
        },
        {
            icon: 'schedule',
            title: '駅別時刻表',
            subtitle: '駅を選んですぐ表示',
            link: ['/timetable', 'station'],
            accent: false,
        },
        {
            icon: 'ssid_chart',
            title: 'ダイヤグラム',
            subtitle: '全列車を斜め線で俯瞰',
            link: ['/train-diagram'],
            accent: false,
        },
    ];
}
