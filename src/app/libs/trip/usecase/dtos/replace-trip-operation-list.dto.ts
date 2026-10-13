import { CreateTripOperationListDto } from './create-trip-operation-list.dto';

/** id は既存の区間だけが持つ（新しい区間は無い） */
export interface ReplaceTripOperationListDto extends CreateTripOperationListDto {
    id?: string;
}
