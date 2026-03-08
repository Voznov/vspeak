import { type PoolClient } from 'pg';
import { type PostgresMigration } from '../postgres.types';

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
];

export class AddBgColorToUsers20260308003 implements PostgresMigration {
  async up(client: PoolClient): Promise<void> {
    await client.query(`ALTER TABLE users ADD COLUMN bg_color VARCHAR(7) NOT NULL DEFAULT '#78909C'`);

    // Assign a deterministic color from PALETTE based on a hash of the user id
    const paletteArray = `ARRAY[${PALETTE.map((c) => `'${c}'`).join(', ')}]`;
    await client.query(`UPDATE users SET bg_color = (${paletteArray})[(abs(hashtext(id::text)) % ${PALETTE.length}) + 1]`);
  }

  async down(client: PoolClient): Promise<void> {
    await client.query('ALTER TABLE users DROP COLUMN bg_color');
  }
}
