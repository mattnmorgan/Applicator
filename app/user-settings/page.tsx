import { redirect } from 'next/navigation';

export default function UserSettingsPage() {
  // Redirect to profile page by default
  redirect('/user-settings/profile');
}
