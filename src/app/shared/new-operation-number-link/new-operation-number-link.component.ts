import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

type NewOperationNumberLinkContextMenu = {
    icon: string;
    text: string;
    disabled?: boolean;
    onClick: () => void;
};

@Component({
    selector: 'app-new-operation-number-link',
    templateUrl: './new-operation-number-link.component.html',
    styleUrl: './new-operation-number-link.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MatMenuModule, MatButtonModule, MatIconModule],
})
export class NewOperationNumberLinkComponent {
    readonly text = input.required<string>();
    readonly textStyle = input<'normal' | 'bold' | 'underline'>('normal');
    readonly bgColor = input<string>(undefined);
    readonly borderEnabled = input<boolean>(false);
    readonly borderColor = input<string>(undefined);
    readonly link = input<string[]>(undefined);
    readonly contextMenus =
        input<NewOperationNumberLinkContextMenu[]>(undefined);
}
