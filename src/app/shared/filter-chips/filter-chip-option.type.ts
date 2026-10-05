export type FilterChipValue = string | number;

export type FilterChipOption = {
    value: FilterChipValue;
    label: string;
    color?: string;
    disabled?: boolean;
    /** 会社などのグループ名。指定すると同じ group 見出しごとにまとめて表示する。 */
    group?: string;
    /**
     * このオプションだけ選択時の塗り色を変える（未指定はコンポーネントの
     * selectedColor に従う）。98 §G2: 会社=紺・運用群=オレンジの
     * 2 系統を 1 行に混在させるために使う。
     */
    selectedColor?: 'primary' | 'accent';
};
