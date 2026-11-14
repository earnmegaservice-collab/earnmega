import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MASTER_ADMINS = [
  'horpalservice@gmail.com',
  'geestablish@gmail.com',
  'earnmegaservice@gmail.com',
];

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase Admin Keys');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdminRequest(request: Request, adminSupabase: any): Promise<boolean> {
  const commandHeader = request.headers.get('x-admin-command-key');
  if (commandHeader === 'geemings-command-x9v2-authorized') {
    return true;
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const { data: { user } } = await adminSupabase.auth.getUser(token);
      if (user?.email && MASTER_ADMINS.includes(user.email.toLowerCase().trim())) {
        return true;
      }
    }
  }
  return false;
}

export async function GET(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = adminSupabase
      .from('pillar2_products')
      .select('*')
      .order('created_at', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, products: data || [] },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const isAuthorized = await verifyAdminRequest(request, adminSupabase);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized Admin Access' }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body.title || body.name || '').trim();
    const priceGhs = Number(body.price_ghs ?? body.priceGHS ?? 0);
    const driveDeliveryUrl = String(body.drive_delivery_url || body.drive_url || body.deliveryUrl || '').trim();
    const creatorName = String(body.creator_name || body.creator || 'Gerald').trim() || 'Gerald';
    const category = String(body.category || 'Digital Mastery').trim() || 'Digital Mastery';
    const subtitle = String(body.subtitle || body.headline || '').trim();
    const description = String(body.description || body.subheadline || '').trim();
    const coverImageUrl = String(body.cover_image_url || body.imageUrl || '').trim();
    const commissionRate = Number(body.commission_rate ?? 0.5);

    if (!title || !Number.isFinite(priceGhs) || priceGhs <= 0 || !driveDeliveryUrl) {
      return NextResponse.json(
        { success: false, error: 'Product Title, valid Price (GH₵), and Google Drive Delivery URL are required.' },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 28);
    const id = String(body.id || '').trim() || `prod_${slug || 'custom'}_${Date.now().toString(36)}`;

    let features: string[] = [];
    if (Array.isArray(body.features)) {
      features = body.features.map((f: any) => String(f).trim()).filter(Boolean);
    } else if (typeof body.features === 'string' && body.features.trim()) {
      features = body.features
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    if (features.length === 0) {
      features = [
        `Complete step-by-step ${title} implementation blueprint`,
        `Created & verified by ${creatorName}`,
        'Instant Google Drive Vault delivery upon Paystack verification',
        'Includes 50% instant affiliate commission split in Pillar 2 Marketplace',
      ];
    }

    const productRow = {
      id,
      title,
      subtitle: subtitle || `Master ${title} — Official Earnmega Digital Vault`,
      category,
      creator_name: creatorName,
      price_ghs: Number(priceGhs.toFixed(2)),
      commission_rate: Number.isFinite(commissionRate) && commissionRate > 0 ? commissionRate : 0.5,
      drive_delivery_url: driveDeliveryUrl,
      cover_image_url: coverImageUrl || null,
      description:
        description ||
        `Unlock instant access to ${title} by ${creatorName}, including complete training resources and 50% affiliate resale rights.`,
      features,
      is_active: body.is_active !== false,
      total_sales: Number(body.total_sales || 0),
    };

    const { data, error } = await adminSupabase
      .from('pillar2_products')
      .upsert(productRow, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    try {
      await adminSupabase.channel('horpal_godmode_command').send({
        type: 'broadcast',
        event: 'PRODUCTS_UPDATED',
        payload: { productId: data.id, action: 'upsert', timestamp: Date.now() },
      });
    } catch (_) {}

    return NextResponse.json({ success: true, product: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to publish product' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const isAuthorized = await verifyAdminRequest(request, adminSupabase);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized Admin Access' }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing product id' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.subtitle === 'string') updates.subtitle = body.subtitle.trim();
    if (typeof body.category === 'string' && body.category.trim()) updates.category = body.category.trim();
    if (typeof body.creator_name === 'string' && body.creator_name.trim()) updates.creator_name = body.creator_name.trim();
    if (body.price_ghs !== undefined && Number.isFinite(Number(body.price_ghs)) && Number(body.price_ghs) > 0) {
      updates.price_ghs = Number(Number(body.price_ghs).toFixed(2));
    }
    if (typeof body.drive_delivery_url === 'string' && body.drive_delivery_url.trim()) {
      updates.drive_delivery_url = body.drive_delivery_url.trim();
    }
    if (typeof body.cover_image_url === 'string') {
      updates.cover_image_url = body.cover_image_url.trim() || null;
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }
    if (Array.isArray(body.features)) {
      updates.features = body.features;
    }
    if (typeof body.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }

    const { data, error } = await adminSupabase
      .from('pillar2_products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    try {
      await adminSupabase.channel('horpal_godmode_command').send({
        type: 'broadcast',
        event: 'PRODUCTS_UPDATED',
        payload: { productId: id, action: 'update', timestamp: Date.now() },
      });
    } catch (_) {}

    return NextResponse.json({ success: true, product: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const isAuthorized = await verifyAdminRequest(request, adminSupabase);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized Admin Access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || '';
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = String(body.id || body.productId || '').trim();
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing product id' }, { status: 400 });
    }

    const { error } = await adminSupabase.from('pillar2_products').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    try {
      await adminSupabase.channel('horpal_godmode_command').send({
        type: 'broadcast',
        event: 'PRODUCTS_UPDATED',
        payload: { productId: id, action: 'delete', timestamp: Date.now() },
      });
    } catch (_) {}

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
