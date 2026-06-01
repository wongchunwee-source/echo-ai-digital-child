import React from 'react'
import { BookOpen, Camera } from 'lucide-react'

function GrowthPreviewCard({ nextEntry, onOpen }) {
  if (!nextEntry || typeof nextEntry.unlockDay !== 'number' || typeof nextEntry.currentDay !== 'number') {
    return (
      <button onClick={onOpen} className="mt-5 w-full rounded-[28px] bg-white p-5 text-left shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#fff0df] text-[#ff8f68]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#8a7867]">成长相册</p>
            <h3 className="text-lg font-black">所有重要照片都已解锁</h3>
          </div>
        </div>
      </button>
    )
  }

  const daysLeft = Math.max(0, nextEntry.unlockDay - nextEntry.currentDay)
  const previousDay = nextEntry.previousUnlockDay ?? 1
  const progress = Math.max(0, Math.min(100, Math.round(((nextEntry.currentDay - previousDay) / (nextEntry.unlockDay - previousDay)) * 100)))

  return (
    <button onClick={onOpen} className="mt-5 w-full rounded-[28px] bg-white p-5 text-left shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#e9f5f2] text-[#2f8b87]">
          <Camera className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#8a7867]">📷 下一张成长照</p>
          <h3 className="truncate text-lg font-black">{nextEntry.stage}</h3>
        </div>
        <span className="rounded-full bg-[#fff0df] px-3 py-1 text-xs font-black text-[#ff8f68]">还有{daysLeft}天</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0dccb]">
        <div className="h-full rounded-full bg-[#2f8b87]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs font-bold text-[#8a7867]">{progress}%</p>
    </button>
  )
}

export default GrowthPreviewCard
