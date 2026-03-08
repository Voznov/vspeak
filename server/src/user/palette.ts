import { z } from 'zod';

export const PALETTE = [
  '#5C6BC0',
  '#7E57C2',
  '#AB47BC',
  '#EC407A',
  '#EF5350',
  '#FF7043',
  '#FFA726',
  '#FFCA28',
  '#D4E157',
  '#9CCC65',
  '#66BB6A',
  '#26A69A',
  '#26C6DA',
  '#29B6F6',
  '#42A5F5',
  '#78909C',
  '#8D6E63',
  '#BDBDBD',
] as const;

export const zBgColor = z.enum(PALETTE);
