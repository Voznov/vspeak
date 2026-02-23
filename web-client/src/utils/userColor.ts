const PALETTE = [
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

export const getUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }

  return PALETTE[Math.abs(hash) % PALETTE.length];
};
