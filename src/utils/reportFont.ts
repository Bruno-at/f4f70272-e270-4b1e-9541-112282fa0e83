import jsPDF from 'jspdf';

export type ReportFontId = 'helvetica' | 'times' | 'courier' | 'helvetica-bold';

export interface ReportFontOption {
  id: ReportFontId;
  label: string;
  description: string;
  family: 'helvetica' | 'times' | 'courier';
  forceStyle: 'bold' | null;
  cssFamily: string;
}

export const REPORT_FONT_OPTIONS: ReportFontOption[] = [
  {
    id: 'helvetica',
    label: 'Modern Sans (Helvetica)',
    description: 'Clean modern sans-serif — the default look.',
    family: 'helvetica',
    forceStyle: null,
    cssFamily: 'Helvetica, Arial, sans-serif',
  },
  {
    id: 'times',
    label: 'Classic Serif (Times)',
    description: 'Traditional serif font, great for formal reports.',
    family: 'times',
    forceStyle: null,
    cssFamily: '"Times New Roman", Times, serif',
  },
  {
    id: 'courier',
    label: 'Typewriter (Courier)',
    description: 'Monospaced typewriter style for a distinctive look.',
    family: 'courier',
    forceStyle: null,
    cssFamily: '"Courier New", Courier, monospace',
  },
  {
    id: 'helvetica-bold',
    label: 'Bold Modern (Helvetica Bold)',
    description: 'Stronger, heavier sans-serif — high emphasis.',
    family: 'helvetica',
    forceStyle: 'bold',
    cssFamily: 'Helvetica, Arial, sans-serif',
  },
];

let currentOption: ReportFontOption = REPORT_FONT_OPTIONS[0];
let patched = false;

const ensurePatched = () => {
  if (patched) return;
  const proto: any = (jsPDF as any).prototype;
  const original = proto.setFont;
  proto.setFont = function (family: string, style?: string, weight?: string | number) {
    const forced = currentOption.forceStyle;
    const effectiveStyle = forced ? forced : style;
    return original.call(this, currentOption.family, effectiveStyle, weight);
  };
  patched = true;
};

ensurePatched();

export const setReportFont = (id: string | null | undefined) => {
  const opt = REPORT_FONT_OPTIONS.find(o => o.id === id) || REPORT_FONT_OPTIONS[0];
  currentOption = opt;
  ensurePatched();
};

export const getReportFont = (): ReportFontOption => currentOption;

export const getReportFontCss = (): string => currentOption.cssFamily;
