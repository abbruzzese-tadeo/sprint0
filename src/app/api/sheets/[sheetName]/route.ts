import { fetchSheetData } from '@/lib/fetchSheetData';
import { NextResponse } from 'next/server';

const SHEET_CONFIGS = {
  A: {
    id: process.env.SHEET_A_ID ?? '',
    range: process.env.SHEET_A_RANGE ?? '',
  },
  B: {
    id: process.env.SHEET_B_ID ?? '',
    range: process.env.SHEET_B_RANGE ?? '',
  },
  C: {
    id: process.env.SHEET_C_ID ?? '',
    range: process.env.SHEET_C_RANGE ?? '',
  },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname; // Ej: /api/sheets/A
  const parts = pathname.split('/');
  const sheetName = parts[parts.length - 1]; // Extrae 'A'

  const config = SHEET_CONFIGS[sheetName];

  if (!config || !config.id) {
    return NextResponse.json(
      { error: 'Sheet no encontrado o ID no definido. Verifica .env.local.' },
      { status: 404 }
    );
  }

  try {
    const rows = await fetchSheetData(config.id, config.range, sheetName);
    return NextResponse.json({ rows });
  } catch (error: any) {
    console.error('Error en API sheets:', error);
    return NextResponse.json({ error: error.message || 'Error inesperado' }, { status: 500 });
  }
}