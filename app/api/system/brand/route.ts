import { NextResponse } from 'next/server';
import { getSystemSetting, setSystemSetting } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const brandName = await getSystemSetting('brandName');
    const brandIcon = await getSystemSetting('brandIcon');

    return NextResponse.json({
      brandName: brandName || 'Applicator',
      brandIcon: brandIcon ? `/api/assets/system/brand?t=${Date.now()}` : undefined,
    });
  } catch (error) {
    console.error('Failed to fetch brand settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const brandName = formData.get('brandName') as string;
    const iconFile = formData.get('brandIcon') as File | null;
    const clearIcon = formData.get('clearBrandIcon') === 'true';

    // Handle brand name update
    if (brandName !== null && brandName !== undefined) {
      await setSystemSetting('brandName', brandName);
    }

    // Handle clearing icon
    if (clearIcon) {
      await setSystemSetting('brandIcon', '');
    }

    // Handle icon upload if provided
    if (iconFile) {
      const systemStorage = await getSystemSetting('storage');

      if (!systemStorage) {
        return NextResponse.json(
          { error: 'System storage not configured' },
          { status: 500 }
        );
      }

      // Create directory structure
      const brandDir = path.join(systemStorage, 'system');

      if (!fs.existsSync(brandDir)) {
        fs.mkdirSync(brandDir, { recursive: true });
      }

      // Get file extension and save
      const fileExtension = iconFile.name.split('.').pop() || 'png';
      const fileName = `brand.${fileExtension}`;
      const filePath = path.join(brandDir, fileName);

      const buffer = Buffer.from(await iconFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      const relativePath = path.join('system', fileName);
      await setSystemSetting('brandIcon', relativePath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update brand settings:', error);
    return NextResponse.json(
      { error: 'Failed to update brand settings' },
      { status: 500 }
    );
  }
}
