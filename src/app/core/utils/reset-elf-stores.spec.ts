import { createStore, setProp, withProps } from '@ngneat/elf';
import { resetElfStores } from './reset-elf-stores';

describe('resetElfStores', () => {
    it('登録されたストアを作ったときの中身に戻す', () => {
        const store = createStore(
            { name: 'ResetElfStoresSpec' },
            withProps<{ stationName: string | null }>({ stationName: null }),
        );
        store.update(setProp('stationName', '二俣川'));

        resetElfStores();

        expect(store.getValue().stationName).toBeNull();
    });
});
