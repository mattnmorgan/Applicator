import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllApps } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const { widgetId } = await params;

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin authorization (required for system settings)
    if (!user.authorizations.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required for system settings' },
        { status: 403 }
      );
    }

    // Find the widget across all apps
    const allApps = await getAllApps();
    let foundWidget = null;
    let foundApp = null;

    for (const app of allApps) {
      if (app.widgets) {
        const widget = app.widgets.find(w => w.id === widgetId && w.target === 'system-settings');
        if (widget) {
          foundWidget = widget;
          foundApp = app;
          break;
        }
      }
    }

    if (!foundWidget || !foundApp) {
      return NextResponse.json({ error: 'System settings widget not found' }, { status: 404 });
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
    console.error('Error fetching system settings widget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
