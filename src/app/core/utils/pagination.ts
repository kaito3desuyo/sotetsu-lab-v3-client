import { HttpResponse } from '@angular/common/http';
import { isEqual } from 'lodash-es';

const headerName = [
    'x-item-count',
    'x-item-per-page',
    'x-total-count',
    'x-total-page',
];

interface ApiPageSettings {
    itemCount: number;
    itemPerPage: number;
    totalCount: number;
    totalPage: number;
}

export class Pagination<T> {
    private readonly _items: Readonly<T[]>;
    private readonly _pageSettings: Readonly<ApiPageSettings>;

    get items(): T[] {
        return [...this._items];
    }

    get pageSettings(): ApiPageSettings {
        return { ...this._pageSettings };
    }

    private constructor(items: T[], pageSettings: ApiPageSettings) {
        this._items = Object.freeze(items);
        this._pageSettings = Object.freeze(pageSettings);
    }

    static create<T>(items: T[], pageSettings: ApiPageSettings): Pagination<T> {
        return new Pagination(items, pageSettings);
    }

    static isApiPaginated<Model>(res: HttpResponse<Model[]>): boolean {
        return isEqual(
            res.headers
                .keys()
                .filter((header) => headerName.some((h) => h === header)),
            headerName
        );
    }

    static getApiPageSettings<Model>(
        res: HttpResponse<Model[]>
    ): ApiPageSettings {
        return {
            itemCount: +res.headers.get(headerName[0]),
            itemPerPage: +res.headers.get(headerName[1]),
            totalCount: +res.headers.get(headerName[2]),
            totalPage: +res.headers.get(headerName[3]),
        };
    }
}
