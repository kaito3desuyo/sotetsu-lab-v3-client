// オブジェクトの展開（...）をやめて項目を書き並べるとき、型に項目が増えたら書き漏らしをコンパイルで気づくための型。
// `const dto: AllKeys<FooDto> = { … }` のように受ける（省略可の項目も必須として扱う）。
export type AllKeys<T> = { [K in keyof Required<T>]: T[K] };
