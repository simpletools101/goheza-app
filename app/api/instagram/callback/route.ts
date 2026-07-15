import { baseURL } from '@/lib/env'
import { createClient } from '@/lib/supabase/serverSideClient'

export async function GET(req: Request) {
    try {
        /**
         * -----------------------------------------
         */
        const supabase = await createClient()

        /**
         * ----------------------------------------------s
         */

        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state') // user_id

        // Exchange code for short-lived token
        const tokenRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?` +
                `client_id=${process.env.INSTAGRAM_APP_ID}&` +
                `client_secret=${process.env.INSTAGRAM_APP_SECRET}&` +
                `redirect_uri=${encodeURIComponent(`${baseURL}/api/instagram/callback`)}&` +
                `code=${code}`
        )

        const { access_token: shortToken } = await tokenRes.json()

        // Get long-lived token (60 days)
        const longTokenRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?` +
                `grant_type=fb_exchange_token&` +
                `client_id=${process.env.INSTAGRAM_APP_ID}&` +
                `client_secret=${process.env.INSTAGRAM_APP_SECRET}&` +
                `fb_exchange_token=${shortToken}`
        )
        const { access_token: longToken, expires_in } = await longTokenRes.json()

        // Get user's Instagram Business accounts (via connected FB Pages)
        const accountsRes = await fetch(
            `https://graph.facebook.com/v20.0/me/app/accounts?` +
                `fields=instagram_business_account{id,name}&` +
                `access_token=${longToken}`
        )
        const { data: pages } = await accountsRes.json()

        // Assume first IG account (you can let user choose)
        const igAccount = pages?.[0]?.instagram_business_account
        if (!igAccount) throw new Error('No Instagram Business account connected')

        await supabase.from('social_accounts').upsert({
            user_id: state,
            platform: 'instagram', // ✅ add this
            instagram_business_id: igAccount.id,
            access_token: longToken,
            expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        })

        return Response.redirect(`${baseURL}/app/auth/onboarding/socials`)
    } catch (error) {
        console.error(error)
        return Response.json({ error: error }, { status: 500 })
    }
}
