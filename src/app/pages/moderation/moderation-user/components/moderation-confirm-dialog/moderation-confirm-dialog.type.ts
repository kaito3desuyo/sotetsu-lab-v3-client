export type ModerationConfirmDialogData = {
    title: string;
    /** 件数と対象の名前など、確認として読ませる行 */
    lines: string[];
    /** 理由が必須か（BAN・まとめての無効化は必須、BAN の解除は任意） */
    reasonRequired: boolean;
    confirmLabel: string;
};

export type ModerationConfirmDialogResult = { reason: string };
