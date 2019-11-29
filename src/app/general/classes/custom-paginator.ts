import { MatPaginatorIntl } from '@angular/material/paginator';
import { Injectable } from '@angular/core';

@Injectable()
export class CustomPaginator extends MatPaginatorIntl {
    constructor() {
        super();
        this.nextPageLabel = '次のページ';
        this.previousPageLabel = '前のページ';
        this.itemsPerPageLabel = '件数';
        this.getRangeLabel = (page, pageSize, length) => {
            if (length === 0 || pageSize === 0) {
                return '0' + ' / ' + length;
            }
            length = Math.max(length, 0);
            const startIndex = page * pageSize;

            const endIndex =
                startIndex < length
                    ? Math.min(startIndex + pageSize, length)
                    : startIndex + pageSize;
            return startIndex + 1 + ' - ' + endIndex + ' ' + '/' + ' ' + length;
        };
    }
}
