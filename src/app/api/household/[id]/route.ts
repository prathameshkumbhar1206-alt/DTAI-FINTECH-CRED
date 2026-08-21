import { NextResponse } from 'next/server';
import { getFullHousehold } from '@/lib/db-helper';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const household = getFullHousehold(id);
  if (!household) return NextResponse.json({ error: 'Household not found' }, { status: 404 });
  return NextResponse.json(household);
}
