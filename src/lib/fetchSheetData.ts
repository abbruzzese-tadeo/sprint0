// src/lib/fetchSheetData.ts
import { google } from 'googleapis'; // Import estándar (sin paths internos)

// Carga vars de env
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Convierte \n a saltos reales

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  throw new Error('Credenciales de Service Account incompletas en .env.local. Verifica PROJECT_ID, CLIENT_EMAIL y PRIVATE_KEY.');
}

// Función para crear cliente auth (JWT)
const getSheetsAuthClient = async () => {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    projectId: PROJECT_ID,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], 

  });

  try {
    const token = await auth.getAccessToken();
    console.log('Service Account autenticado correctamente. Token obtenido.');
    return auth;
  } catch (error) {
    console.error('Error en autenticación Service Account:', error);
    throw new Error('Falla en autenticación de Google Sheets. Verifica credenciales en .env.local y habilita Sheets API.');
  }
};

// Función principal para fetch un sheet
export async function fetchSheetData(
  spreadsheetId: string,
  range: string,
  sheetName?: string // Opcional para logs
): Promise<string[][]> {
  const auth = await getSheetsAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`Fetching sheet ${sheetName || 'Unknown'}: ID=${spreadsheetId}, range=${range}`);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const values = response.data.values || [];
    console.log(`Sheet ${sheetName || 'Unknown'} fetched: ${values.length} rows (primeras 2: ${JSON.stringify(values.slice(0, 2))})`); // Log sample para debug
    return values;
  } catch (error: any) {
    console.error(`Error fetching sheet ${spreadsheetId}:`, error);
    if (error.response?.status === 403) {
      throw new Error(`Acceso denegado al sheet ${spreadsheetId}. Agrega el Service Account email (${CLIENT_EMAIL}) como editor en el sheet.`);
    } else if (error.response?.status === 404) {
      throw new Error(`Sheet no encontrado: ${spreadsheetId}. Verifica ID en .env.local.`);
    } else if (error.code === 'ENOTFOUND' || error.message.includes('ECONNREFUSED')) {
      throw new Error('Error de conexión a Google API. Verifica internet y credenciales.');
    }
    throw new Error(`Error en Google Sheets API: ${error.message || error.toString()}`);
  }
}