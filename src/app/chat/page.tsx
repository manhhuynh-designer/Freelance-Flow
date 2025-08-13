
import { redirect } from 'next/navigation';

export default function OldChatRedirectPage() {
  redirect('/dashboard/ai-assistant');
  return null;
}
