import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/managers/user';
import AppManager from '@/lib/database/managers/app';
import AuthorityManager from '@/lib/database/managers/authority';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const { widgetId } = await params;

    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = currentUser.user;

    // Get user's authority
    const authorityManager = new AuthorityManager();
    const authority = await authorityManager.readRecord(user.data.authority);
    if (!authority) {
      return NextResponse.json({ error: 'Authority not found' }, { status: 404 });
    }

    // Find the widget across all apps
    const appManager = new AppManager();
    const appKeys = await appManager.listRecords();
    let foundWidget = null;
    let foundAppId = null;

    for (const key of appKeys) {
      const appId = key.split(":").pop();
      if (!appId) continue;

      const app = await appManager.readRecord(appId);
      if (app && app.data.subApps) {
        for (const subApp of app.data.subApps) {
          if (subApp.widgets) {
            const widget = subApp.widgets.find(w => w.id === widgetId);
            if (widget) {
              foundWidget = widget;
              foundAppId = app.id;
              break;
            }
          }
        }
        if (foundWidget) break;
      }
    }

    if (!foundWidget || !foundAppId) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Check if user has access to the app
    if (!authority.data.apps.includes(foundAppId)) {
      return NextResponse.json(
        { error: 'You do not have access to this widget' },
        { status: 403 }
      );
    }

    // Return widget information
    return NextResponse.json({
      id: foundWidget.id,
      name: foundWidget.name,
      description: foundWidget.description,
      target: foundWidget.target,
      component: foundWidget.component,
      appId: foundWidget.appId,
    });
  } catch (error) {
    console.error('Error fetching widget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
