import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * ページ上端の操作部（選択欄・チップ・切り替え）を載せる全幅の白い帯。
 * 列車ダイヤグラム・列車位置情報の表示設定と同じ見た目（白地＋下の罫線）にそろえる。
 *
 * main の余白（tw-p-4 md:tw-p-6 lg:tw-p-8 xl:tw-p-16）の中に置き、上と左右の余白を
 * 負のマージンで打ち消して端から端まで抜く。中身は同じ値の内側の余白で本文の左右にそろえる。
 * main の余白を変えるときはここも変えること。
 *
 * 帯の中の余白は「帯の上下 16px・まとまりの間 16px・ラベルとチップの間 8px・チップの段の間 8px」。
 * チップの行は Material の既定でチップの上下に 4px の余白を持ち、帯の下やラベルとの間だけ 4px 広がって
 * いたので、帯の中に限って打ち消す（共有のチップ部品は他のページでも使うので触らない）。 */
@Component({
    selector: 'app-control-band',
    template: '<ng-content></ng-content>',
    styles: `
        :host ::ng-deep app-filter-chips {
            display: block;
            margin-block: -4px;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'tw-block -tw-mx-4 -tw-mt-4 tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-bg-white tw-px-4 tw-py-4 md:-tw-mx-6 md:-tw-mt-6 md:tw-px-6 lg:-tw-mx-8 lg:-tw-mt-8 lg:tw-px-8 xl:-tw-mx-16 xl:-tw-mt-16 xl:tw-px-16',
    },
})
export class ControlBandComponent {}
