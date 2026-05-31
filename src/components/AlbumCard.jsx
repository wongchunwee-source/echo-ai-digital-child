import { Lock, Sparkles } from 'lucide-react'

function AlbumCard({ entry, isLast }) {
  const daysLeft = Math.max(0, entry.unlockDay - entry.currentDay)

  return (
    <article className="relative grid grid-cols-[52px_1fr] gap-3">
      <div className="relative flex justify-center">
        {!isLast && <div className="absolute top-12 h-full w-px bg-[#ead9c9]" />}
        <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-soft ${entry.isUnlocked ? 'bg-[#342b25]' : 'bg-white grayscale'}`}>
          {entry.emoji}
        </div>
      </div>

      <div className={`overflow-hidden rounded-[28px] bg-white shadow-soft ${entry.isUnlocked ? '' : 'opacity-70'}`}>
        <div className="relative h-44 overflow-hidden bg-[#fff0df]">
          {entry.imageUrl ? (
            <img src={entry.imageUrl} alt={entry.stage} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#fff7e8,rgba(255,184,117,0.48)_38%,rgba(47,139,135,0.28)_76%)]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/72 text-5xl shadow-[0_0_56px_rgba(255,255,255,0.72)]">
                {entry.emoji}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(52,43,37,0.76))]" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
            <div>
              <p className="text-xs font-bold text-white/75">Day {entry.unlockDay}</p>
              <h3 className="text-xl font-black">{entry.stage}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${entry.isUnlocked ? 'bg-[#ff8f68]' : 'bg-white/18 backdrop-blur'}`}>
              {entry.isUnlocked ? '已解锁' : `还有${daysLeft}天`}
            </span>
          </div>
        </div>

        <div className="p-4">
          <p className="text-base font-black leading-snug text-[#342b25]">{entry.title}</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#8a7867]">
            {entry.isUnlocked ? <Sparkles className="h-4 w-4 text-[#ff8f68]" /> : <Lock className="h-4 w-4" />}
            <span>{entry.unlockLabel}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

export default AlbumCard
