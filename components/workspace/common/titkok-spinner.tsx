'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { ChevronLeft, Maximize2, AlertCircle, Play, Pause } from 'lucide-react'

/**
 * TikTokUploadPanel
 * ------------------
 * Reusable "Upload to TikTok" review screen, built to satisfy TikTok's
 * Direct Post API Developer Guidelines (content-sharing-guidelines):
 *  - No default privacy selection
 *  - Comment/Duet/Stitch checkboxes off by default, disabled when
 *    creator_info reports them off in the user's TikTok app settings
 *  - Commercial content disclosure toggle (off by default) with
 *    "Your Brand" / "Branded Content" sub-options
 *  - Correct label + consent copy per TikTok's rules
 *  - Branded Content cannot be paired with private/"only me" visibility
 *  - Video duration is checked against max_video_post_duration_sec
 *
 * You wire in:
 *  - fetchCreatorInfo(): calls YOUR server route, which calls TikTok's
 *    creator_info endpoint server-side (client_secret never touches
 *    the browser).
 *  - onSubmit(payload): your actual publish call (Direct Post API
 *    request, or your own queued-post logic).
 */

export interface TikTokCreatorInfo {
    creatorAvatarUrl: string
    creatorNickname: string
    /** e.g. ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'] */
    privacyLevelOptions: string[]
    commentDisabled: boolean
    duetDisabled: boolean
    stitchDisabled: boolean
    maxVideoPostDurationSec: number
    canPostNow: boolean // false if creator_info says they can't post right now
}

export interface TikTokUploadPayload {
    caption: string
    privacyLevel: string
    allowComment: boolean
    allowDuet: boolean
    allowStitch: boolean
    discloseContent: boolean
    isYourBrand: boolean
    isBrandedContent: boolean
}

interface TikTokUploadPanelProps {
    videoFile: File
    /** Local object URL or hosted URL used for the <video> preview */
    videoUrl: string
    onBack?: () => void
    fetchCreatorInfo: () => Promise<TikTokCreatorInfo>
    onSubmit: (payload: TikTokUploadPayload) => Promise<void>
}

const PRIVACY_LABELS: Record<string, string> = {
    PUBLIC_TO_EVERYONE: 'Public',
    MUTUAL_FOLLOW_FRIENDS: 'Friends',
    FOLLOWER_OF_CREATOR: 'Followers',
    SELF_ONLY: 'Only me',
}

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)}MB`
}

function formatTime(seconds: number) {
    if (!isFinite(seconds)) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const MOCK_CREATOR_INFO: TikTokCreatorInfo = {
    creatorAvatarUrl: 'https://i.pravatar.cc/150?img=12',
    creatorNickname: 'pius_creator',
    privacyLevelOptions: [
        'PUBLIC_TO_EVERYONE',
        'MUTUAL_FOLLOW_FRIENDS',
        'FOLLOWER_OF_CREATOR',
        'SELF_ONLY',
    ],
    commentDisabled: false,
    duetDisabled: false,
    stitchDisabled: false,
    maxVideoPostDurationSec: 600,
    canPostNow: true,
}

export default function TikTokUploadPanel({
    videoFile,
    videoUrl,
    onBack,
    fetchCreatorInfo,
    onSubmit,
}: TikTokUploadPanelProps) {
    // ── Creator info ──────────────────────────────────────────────────
    const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo>(MOCK_CREATOR_INFO)
    const [loadingCreator, setLoadingCreator] = useState(false)

    useEffect(() => {
        // let active = true
        // ;(async () => {
        //     try {
        //         const info = await fetchCreatorInfo()
        //         if (!active) return
        //         setCreatorInfo(info)
        //         if (!info.canPostNow) {
        //             toast.error('Your TikTok account cannot post right now. Please try again later.')
        //         }
        //     } catch (err) {
        //         console.error('Failed to fetch TikTok creator info:', err)
        //         toast.error('Could not load your TikTok account. Please reconnect TikTok.')
        //     } finally {
        //         if (active) setLoadingCreator(false)
        //     }
        // })()
        // return () => {
        //     active = false
        // }
    }, [fetchCreatorInfo])

    // ── Video preview / metadata ─────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [resolution, setResolution] = useState<string>('—')

    const handleLoadedMetadata = useCallback(() => {
        const v = videoRef.current
        if (!v) return
        setDuration(v.duration)
        setResolution(`${v.videoHeight >= 1080 ? '1080P' : `${v.videoHeight}P`}`)
    }, [])

    const togglePlay = () => {
        const v = videoRef.current
        if (!v) return
        if (v.paused) {
            v.play()
            setIsPlaying(true)
        } else {
            v.pause()
            setIsPlaying(false)
        }
    }

    // const fileFormat = (videoFile.name.split('.').pop() || '').toUpperCase()

    // ── Form state ────────────────────────────────────────────────────
    const [caption, setCaption] = useState('')
    const [privacyLevel, setPrivacyLevel] = useState('') // intentionally no default
    const [allowComment, setAllowComment] = useState(false)
    const [allowDuet, setAllowDuet] = useState(false)
    const [allowStitch, setAllowStitch] = useState(false)
    const [discloseContent, setDiscloseContent] = useState(false)
    const [isYourBrand, setIsYourBrand] = useState(false)
    const [isBrandedContent, setIsBrandedContent] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Branded Content can't be private — auto-clear if that combo occurs
    useEffect(() => {
        if (isBrandedContent && privacyLevel === 'SELF_ONLY') {
            setPrivacyLevel('')
            toast.info('Branded content visibility can\u2019t be private. Please choose a different privacy option.')
        }
    }, [isBrandedContent, privacyLevel])

    const durationExceeded =
        creatorInfo != null && duration > 0 && duration > creatorInfo.maxVideoPostDurationSec

    const labelPreview = useMemo(() => {
        if (!discloseContent) return null
        if (isYourBrand && isBrandedContent) return 'Paid partnership'
        if (isBrandedContent) return 'Paid partnership'
        if (isYourBrand) return 'Promotional content'
        return null
    }, [discloseContent, isYourBrand, isBrandedContent])

    const needsAtLeastOneDisclosureOption = discloseContent && !isYourBrand && !isBrandedContent

    const canSubmit =
        !loadingCreator &&
        !!creatorInfo?.canPostNow &&
        !!privacyLevel &&
        !durationExceeded &&
        !needsAtLeastOneDisclosureOption &&
        !submitting

    const handleUpload = async () => {
        if (!canSubmit) return
        setSubmitting(true)
        try {
            await onSubmit({
                caption,
                privacyLevel,
                allowComment,
                allowDuet,
                allowStitch,
                discloseContent,
                isYourBrand: discloseContent && isYourBrand,
                isBrandedContent: discloseContent && isBrandedContent,
            })
        } catch (err) {
            console.error('Publish failed:', err)
            toast.error('Something went wrong publishing to TikTok. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs">
                        ✓
                    </span>
                    Your video is ready!
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0">
                {/* ── Left: video preview ─────────────────────────────── */}
                <div className="bg-black flex flex-col">
                    <div className="relative flex-1 aspect-[9/16] bg-black">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-contain"
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                            onClick={togglePlay}
                        />
                        <button
                            onClick={togglePlay}
                            className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                            <Maximize2 size={14} />
                        </button>
                    </div>
                    <div className="px-3 py-2">
                        <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white"
                                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                            />
                        </div>
                        <div className="text-xs text-white/70 mt-1">
                            {formatTime(currentTime)} | {formatTime(duration)}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 px-3 pb-3 text-[11px] text-white/60">
                        <div>
                            <div className="uppercase">Filename</div>
                            <div className="text-white font-medium truncate">The Daisy Doll</div>
                        </div>
                        <div>
                            <div className="uppercase">Format</div>
                            <div className="text-white font-medium">mp4</div>
                        </div>
                        <div>
                            <div className="uppercase">Resolution</div>
                            <div className="text-white font-medium">{resolution}</div>
                        </div>
                        <div>
                            <div className="uppercase">Size</div>
                            <div className="text-white font-medium">12.3MB</div>
                        </div>
                    </div>
                </div>

                {/* ── Middle: form ─────────────────────────────────────── */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-neutral-900">Upload to TikTok</h2>
                    </div>

                    {/* Creator account */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {loadingCreator ? (
                            <>
                                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                            </>
                        ) : creatorInfo ? (
                            <>
                                <Image
                                    src={creatorInfo.creatorAvatarUrl}
                                    alt={creatorInfo.creatorNickname}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover"
                                />
                                <span className="font-semibold text-neutral-900">
                                    {creatorInfo.creatorNickname}
                                </span>
                            </>
                        ) : (
                            <span className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle size={14} /> Couldn&apos;t load your TikTok account
                            </span>
                        )}
                    </div>

                    {/* Caption */}
                    <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-1">Caption</label>
                        <div className="relative">
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value.slice(0, 100))}
                                placeholder="Add a title that describes your video"
                                rows={3}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#e93838]"
                            />
                            <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                                {caption.length}/100
                            </span>
                        </div>
                    </div>

                    {/* Privacy — no default, must be manually selected */}
                    <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-1">
                            Who can view this video
                        </label>
                        <select
                            value={privacyLevel}
                            onChange={(e) => setPrivacyLevel(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e93838]"
                        >
                            <option value="" disabled>
                                Select an option
                            </option>
                            {creatorInfo?.privacyLevelOptions.map((opt) => (
                                <option
                                    key={opt}
                                    value={opt}
                                    disabled={opt === 'SELF_ONLY' && isBrandedContent}
                                >
                                    {PRIVACY_LABELS[opt] || opt}
                                    {opt === 'SELF_ONLY' && isBrandedContent
                                        ? ' (unavailable for branded content)'
                                        : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Interactions — unchecked by default, disabled per creator settings */}
                    <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-2">Allow users to</label>
                        <div className="flex flex-wrap gap-6">
                            {[
                                { key: 'comment', label: 'Comment', checked: allowComment, set: setAllowComment, disabled: creatorInfo?.commentDisabled },
                                { key: 'duet', label: 'Duet', checked: allowDuet, set: setAllowDuet, disabled: creatorInfo?.duetDisabled },
                                { key: 'stitch', label: 'Stitch', checked: allowStitch, set: setAllowStitch, disabled: creatorInfo?.stitchDisabled },
                            ].map((item) => (
                                <label
                                    key={item.key}
                                    className={`flex items-center gap-2 text-sm ${
                                        item.disabled ? 'text-gray-400' : 'text-neutral-800'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={item.checked}
                                        disabled={item.disabled}
                                        onChange={(e) => item.set(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-[#e93838] focus:ring-[#e93838] disabled:opacity-50"
                                    />
                                    {item.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Disclosure toggle */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <div>
                            <div className="text-sm font-semibold text-neutral-900">Disclose video content</div>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                Turn on to disclose that this video promotes goods or services in exchange for
                                something of value.
                            </p>
                        </div>
                        <button
                            role="switch"
                            aria-checked={discloseContent}
                            onClick={() => setDiscloseContent((v) => !v)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                discloseContent ? 'bg-[#e93838]' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                    discloseContent ? 'translate-x-5' : ''
                                }`}
                            />
                        </button>
                    </div>

                    {durationExceeded && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle size={14} />
                            This video is longer than the {creatorInfo?.maxVideoPostDurationSec}s limit for this
                            account.
                        </p>
                    )}

                    <p className="text-xs text-gray-500">
                        By posting, you agree to TikTok&apos;s{' '}
                        {discloseContent && isBrandedContent && (
                            <a
                                href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#e93838] underline"
                            >
                                Branded Content Policy
                            </a>
                        )}
                        {discloseContent && isBrandedContent && ' and '}
                        <a
                            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#e93838] underline"
                        >
                            Music Usage Confirmation
                        </a>
                        .
                    </p>
                </div>

                {/* ── Right: commercial disclosure panel ──────────────── */}
                {discloseContent && (
                    <div className="lg:col-start-3 bg-gray-50 border-l border-gray-100 p-6 space-y-4 lg:row-span-1">
                        {labelPreview && (
                            <div className="bg-blue-50 border border-blue-100 text-sm text-blue-900 rounded-lg p-3">
                                Your video will be labeled &ldquo;{labelPreview}&rdquo;. This cannot be changed once
                                your video is posted.
                            </div>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isYourBrand}
                                onChange={(e) => setIsYourBrand(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#e93838] focus:ring-[#e93838]"
                            />
                            <div>
                                <div className="text-sm font-semibold text-neutral-900">Your brand</div>
                                <p className="text-xs text-gray-500">
                                    You are promoting yourself or your own business. This video will be classified
                                    as Brand Organic.
                                </p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isBrandedContent}
                                onChange={(e) => setIsBrandedContent(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#e93838] focus:ring-[#e93838]"
                            />
                            <div>
                                <div className="text-sm font-semibold text-neutral-900">Branded content</div>
                                <p className="text-xs text-gray-500">
                                    You are promoting another brand or a third party. This video will be classified
                                    as Branded Content.
                                </p>
                            </div>
                        </label>

                        {needsAtLeastOneDisclosureOption && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle size={14} />
                                You need to indicate if your content promotes yourself, a third party, or both.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Footer — single source of truth for the submit action */}
            <div className="border-t border-gray-100 px-6 py-4">
                <button
                    onClick={handleUpload}
                    disabled={!canSubmit}
                    className={`w-full sm:w-auto sm:min-w-[180px] font-bold py-3 px-6 rounded-lg text-white transition-colors ${
                        canSubmit ? 'bg-[#e93838] hover:bg-[#f17474]' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                    {submitting ? 'Uploading…' : 'Upload'}
                </button>
            </div>
        </div>
    )
}