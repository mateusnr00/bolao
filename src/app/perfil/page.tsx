import { redirect } from 'next/navigation'

import { ProfileScreen } from '@/components/perfil/profile-screen'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/perfil')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <ProfileScreen
      email={user.email ?? ''}
      username={profile?.username ?? ''}
      displayName={profile?.display_name ?? ''}
      avatarUrl={profile?.avatar_url ?? ''}
    />
  )
}
