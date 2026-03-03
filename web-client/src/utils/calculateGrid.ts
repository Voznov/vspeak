type GridResult = {
  columns: number;
  rows: number;
  blockWidth: number;
  blockHeight: number;
};

export const calculateGrid = (W: number, H: number, N: number, aspectRatio: number): GridResult => {
  let best: GridResult = {
    columns: 1,
    rows: N,
    blockWidth: 0,
    blockHeight: 0,
  };

  for (let columns = 1; columns <= N; columns++) {
    const rows = Math.ceil(N / columns);

    const blockWidth = Math.min(W / columns, (H / rows) * aspectRatio);
    const blockHeight = blockWidth / aspectRatio;

    if (blockWidth > best.blockWidth) {
      best = { columns, rows, blockWidth, blockHeight };
    }
  }

  return best;
};
