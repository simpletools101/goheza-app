'use client'

import { useEffect, useState } from 'react'
import UserAccountItem from './user-account'
import { supabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assets/GOHEZA-02.png'
import { HelpCircle, Menu, X } from 'lucide-react'

export default function HeaderItemCreator() {
    const router = useRouter()
    const [role, setRole] = useState('creator')
    const [userName, setUserName] = useState<string>('Goheza')
    const [userEmail, setUserEmail] = useState<string>('Goheza')
    const [userImage, setUserImage] = useState<string>('')
    const [menuOpen, setMenuOpen] = useState(false)

    const onWillSignOutUser = async () => {
        await supabaseClient.auth.signOut({ scope: 'local' })
        router.push('/app/auth/signin')
    }

    const onDidNavigate = () => {
        setMenuOpen(false)
    }

    useEffect(() => {
        const onLoad = async () => {
            const {
                data: { user },
            } = await supabaseClient.auth.getUser()

            if (user) {
                const name =
                    user.identities![0]?.identity_data?.full_name ||
                    user.user_metadata?.full_name ||
                    user.user_metadata.fullName ||
                    'Goheza'
                const avatar = user.identities![0]?.identity_data?.avatar_url || user.user_metadata?.avatar_url || ''
                setUserName(name)
                setUserImage(avatar)
                setUserEmail(user.email!)
            }
        }

        onLoad()
    }, [])

    return (
        <header className="bg-white border-b px-4 sm:px-6 py-3 fixed h-[60px] top-0 z-50 w-full shadow-sm">
            <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
                {/* Logo */}
                <Link href={''} className="flex items-center">
                    <Image src={logo.src} width={100} height={30} alt="Goheza Logo" className="object-contain" />
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-6">
                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/dashboard"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        Earnings
                    </Link>
                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/campaign"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        Campaigns
                    </Link>
                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/submissions"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        Submissions
                    </Link>
                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/socials"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        Socials
                    </Link>


                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/upload"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        Upload
                    </Link>

                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/support"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        Support
                    </Link>



                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/settings"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        Payments
                    </Link>
                    <Link
                        onNavigate={onDidNavigate}
                        href="/app/accounts/creator/howitworks"
                        className="text-gray-600 hover:text-[#e85c51]"
                    >
                        <HelpCircle />
                    </Link>
                    <UserAccountItem
                        userEmail={userEmail}
                        userImageSource={userImage}
                        userName={userName}
                        signOutUser={onWillSignOutUser}
                    />
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center">
                    <button onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? (
                            <X className="w-6 h-6 text-gray-700" />
                        ) : (
                            <Menu className="w-6 h-6 text-gray-700" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden bg-white border-t shadow-md">
                    <nav className="flex flex-col space-y-2 px-4 py-3">
                        <Link
                            onNavigate={onDidNavigate}
                            href="/app/accounts/creator/dashboard"
                            className="text-gray-600 hover:text-[#e85c51]"
                        >
                            Earnings
                        </Link>
                        <Link
                            onNavigate={onDidNavigate}
                            href="/app/accounts/creator/campaign"
                            className="text-gray-600 hover:text-[#e85c51]"
                        >
                            Campaigns
                        </Link>
                        <Link
                            onNavigate={onDidNavigate}
                            href="/app/accounts/creator/submissions"
                            className="text-gray-600 hover:text-[#e85c51]"
                        >
                            Submissions
                        </Link>
                        <Link
                            onNavigate={onDidNavigate}
                            href="/app/accounts/creator/support"
                            className="text-gray-600 hover:text-[#e85c51]"
                        >
                            Support
                        </Link>
                        <Link
                            onNavigate={onDidNavigate}
                            href="/app/accounts/creator/socials"
                            className="text-gray-600 hover:text-[#e85c51]"
                        >
                            Socials
                        </Link>

                        <Link
                            onNavigate={onDidNavigate}
                            href="/app/accounts/creator/settings"
                            className="text-gray-600 hover:text-[#e85c51]"
                        >
                            Payments
                        </Link>

                        <Link
                            onNavigate={onDidNavigate}
                            href="/app/accounts/creator/howitworks"
                            className="text-gray-600 hover:text-[#e85c51]"
                        >
                            <HelpCircle />
                        </Link>
                        <div className="pt-2 border-t mt-2">
                            <UserAccountItem
                                userEmail={userEmail}
                                userImageSource={userImage}
                                userName={userName}
                                signOutUser={onWillSignOutUser}
                            />
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
