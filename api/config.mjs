import { json, settings } from '../lib/settings.mjs';

export function GET() {
  return json({ ragReady: settings().ready });
}
