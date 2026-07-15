'use client'

import TikTokUploadPanel, { TikTokCreatorInfo, TikTokUploadPayload } from '@/components/workspace/common/titkok-spinner'
import { useState } from 'react'

export default function UploadToTiktok() {
    const [videoURL, setVideURL] = useState('')
    const [videoFile, setVideoFile] = useState<File | null>()

    const fetchCreatorInfo = (): Promise<TikTokCreatorInfo> => {
        return new Promise((c, e) => {})
    }

    const onSubmit = (payload: TikTokUploadPayload): Promise<void> => {
        return new Promise((c, e) => {
            c()
        })
    }
    const onBack = () => {}

    return (
        <div className="font-sans px-4 sm:px-6 py-6 space-y-8 sm:space-y-12 max-w-4xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-neutral-850">Upload Tikok Video</h2>

            <div>
                <TikTokUploadPanel
                    fetchCreatorInfo={fetchCreatorInfo}
                    onSubmit={onSubmit}
                    videoFile={videoFile!}
                    videoUrl={'https://hlqxrlkjocyqhjcycnky.supabase.co/storage/v1/object/public/campaign-videos/1780377098360_1000370811.mp4'}
                    onBack={onBack}
                />
            </div>
        </div>
    )
}
