import { createStore, withProps } from '@ngneat/elf';
import { nanoid } from 'nanoid';

export function createElfStore<T>(options: {
    name: string;
    initialValue: T;
    singleton?: boolean;
}) {
    const id = options.singleton ? '' : `-${nanoid()}`;

    return createStore(
        { name: `${options.name}${id}` },
        withProps<T>(options.initialValue),
    );
}
