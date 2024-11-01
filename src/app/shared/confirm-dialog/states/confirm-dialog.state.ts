import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { IConfirmDialogData } from '../interfaces/confirm-dialog-data.interface';

type State = {
    data: IConfirmDialogData;
};

@Injectable()
export class ConfirmDialogStateStore {
    readonly state = createElfStore<State>({
        name: 'ConfirmDialog',
        initialValue: {
            data: null,
        },
    });

    setData(data: IConfirmDialogData): void {
        this.state.update(
            setProps({
                data,
            }),
        );
    }
}

@Injectable()
export class ConfirmDialogStateQuery {
    readonly #store = inject(ConfirmDialogStateStore);

    readonly data$ = this.#store.state.pipe(select((state) => state.data));
}
