import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
    MAT_BOTTOM_SHEET_DATA,
    MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { RouterLink } from '@angular/router';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { findPageHelp, SITE_INTRO, toHelpPage } from './page-help';

export interface PageHelpSheetData {
    /** ヘッダーに出ているページ名。無ければ空文字 */
    pageTitle: string;
    /** toHelpPath を通したパスの型 */
    path: string;
}

type HelpLinkTo = '/guide' | '/glossary';

@Component({
    selector: 'app-page-help-sheet',
    templateUrl: './page-help-sheet.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, RouterLink],
})
export class PageHelpSheetComponent {
    readonly #data = inject<PageHelpSheetData>(MAT_BOTTOM_SHEET_DATA);
    readonly #sheetRef = inject(MatBottomSheetRef);
    readonly #ga = inject(GoogleAnalyticsService);

    readonly heading = this.#data.pageTitle
        ? `${this.#data.pageTitle}の見方`
        : 'Sotetsu Lab. の見方';
    readonly lines: string[] = findPageHelp(this.#data.path)?.lines ?? [
        SITE_INTRO,
    ];

    onLinkClick(to: HelpLinkTo): void {
        this.#ga.sendEvent('help_link', {
            page: toHelpPage(this.#data.path),
            to,
        });
        this.#sheetRef.dismiss();
    }
}
