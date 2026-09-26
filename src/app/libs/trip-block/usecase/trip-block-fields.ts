/**
 * 返す項目の選択（API の `fields[資源]=項目,項目`。sotetsu-lab-v3-api docs/adr/0002-v3-sparse-fieldsets.md）。
 * 資源名は trip / time / tripOperationList / operation / tripClass。指定しなければ全項目。
 * trip-block と trip の id は常に返る。fields を指定すると値が null の項目は省かれる。
 */
export type TripBlockFields = Readonly<Record<string, readonly string[]>>;
