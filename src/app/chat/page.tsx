
import { redirect } from 'next/navigation';

export default function OldChatRedirectPage() {
  redirect('/dashboard/chat');
  return null;
}
