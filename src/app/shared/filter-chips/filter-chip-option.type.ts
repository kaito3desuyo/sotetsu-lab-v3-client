export type FilterChipValue = string | number;

export type FilterChipOption = {
    value: FilterChipValue;
    label: string;
    color?: string;
    disabled?: boolean;
    /** 会社などのグループ名。指定すると同じ group 見出しごとにまとめて表示する。 */
    group?: string;
};
