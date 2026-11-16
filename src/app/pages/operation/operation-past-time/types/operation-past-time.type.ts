import { FormGroup, FormControl } from '@angular/forms';

export type OperationPastTimeSearchParam = {
    referenceDate: Date;
    days: number;
};

export type OperationPastTimeSearchForm = FormGroup<{
    referenceDate: FormControl<Date | null>;
    days: FormControl<number | null>;
    includeInvalidated: FormControl<boolean | null>;
}>;
