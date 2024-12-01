export const enum TabulateTextAlign {
  LEFT = 'L',
  RIGHT = 'R',
}

export interface TabulateTextOptions {
  columns?: {
    align?: TabulateTextAlign;
  }[];
  paddingInner?: string;
  paddingLeft?: string;
  paddingRight?: string;
}

const DEFAULT_TABULATE_TEXT_OPTIONS: TabulateTextOptions = {
  paddingInner: ' ',
  paddingLeft: ' ',
  paddingRight: ' ',
};

export function tabulateText(
  table: string[][],
  options?: TabulateTextOptions
): string[] {
  const opt = { ...DEFAULT_TABULATE_TEXT_OPTIONS, options };
  const widths = table.reduce((widths, row) => {
    return row.map((col, i) =>
      Math.max(stripFormat(col).length, widths[i] || 0)
    );
  }, [] as number[]);

  const pad = (col: number, text: string): string => {
    let method: 'padEnd' | 'padStart' = 'padEnd';
    if (opt?.columns?.[col]?.align === TabulateTextAlign.RIGHT) {
      method = 'padStart';
    }
    return text[method](widths[col], ' ');
  };

  return table.map(
    (row) =>
      opt.paddingLeft +
      row.map((cell, i) => `${pad(i, cell)}`).join(opt.paddingInner) +
      opt.paddingRight
  );
}

// TODO: implement it for real and share it when formatting (colors, etc.) is done
function stripFormat(text: string): string {
  return text;
}
