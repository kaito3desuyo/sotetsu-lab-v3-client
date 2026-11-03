import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Task 6 で中身を作るまでの仮の部品。ページ名の大見出しは置かない（ツールバーが名前を出す） */
@Component({
    selector: 'app-my-page',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyPageComponent {}
