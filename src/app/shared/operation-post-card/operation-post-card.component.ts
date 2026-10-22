import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PanelCardComponent } from '../panel-card/panel-card.component';
import { OperationPostFormComponent } from './operation-post-form.component';

/** 運用情報を投稿するカード（トップ用）。中身は投稿ダイアログと共用のフォーム。 */
@Component({
    selector: 'app-operation-post-card',
    template: `
        <app-panel-card heading="運用情報を投稿する">
            <app-operation-post-form></app-operation-post-form>
        </app-panel-card>
    `,
    styleUrl: './operation-post-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PanelCardComponent, OperationPostFormComponent],
})
export class OperationPostCardComponent {}
