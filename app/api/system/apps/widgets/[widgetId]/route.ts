import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllApps, getAuthority } from '@/lib/db';

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

    // Get user's authority
    const authority = await getAuthority(user.authority);
    if (!authority) {
      return NextResponse.json({ error: 'Authority not found' }, { status: 404 });
    }

    // Find the widget across all apps
    const allApps = await getAllApps();
    let foundWidget = null;
    let foundApp = null;

    for (const app of allApps) {
      if (app.widgets) {
        const widget = app.widgets.find(w => w.id === widgetId);
        if (widget) {
          foundWidget = widget;
          foundApp = app;
          break;
        }
      }
    }

    if (!foundWidget || !foundApp) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Check if user has access to the app
    if (!authority.apps.includes(foundApp.id)) {
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
