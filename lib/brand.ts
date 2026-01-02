import { getSystemSetting } from './db';

export async function getBrandSettings() {
  const brandName = await getSystemSetting('brandName');
  const brandIcon = await getSystemSetting('brandIcon');

  return {
    brandName: brandName || 'Applicator',
    brandIcon: brandIcon ? `/api/assets/system/brand?t=${Date.now()}` : undefined,
  };
}
