/** Shared colour palette (art bible). */
export const PALETTE = {
  cream: '#FFF7E8',
  sky: '#9EDDF5',
  leaf: '#9BCF8A',
  sun: '#FFD66B',
  coral: '#F58F83',
  lavender: '#C5B5F0',
  ink: '#38454A',
} as const;

/** Paint pots offered in the workshop. */
export const PAINT_COLORS: readonly string[] = [
  '#38454A', '#E2706A', '#F9A85A', '#FFD66B', '#72B26C', '#5DB5A8', '#6BBAD7', '#A391DD', '#F9BCC8', '#8F6340', '#FFFDF7',
];

/** Colours a paper shape cycles through when tapped. */
export const SHAPE_TINTS: readonly number[] = [0xf58f83, 0xffd66b, 0x9bcf8a, 0x9eddf5, 0xc5b5f0, 0xf9bcc8, 0xf9a85a];

export const BRUSH_SIZES: readonly number[] = [8, 18, 34, 56];
