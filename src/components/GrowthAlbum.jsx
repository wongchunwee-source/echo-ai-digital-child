import AlbumCard from './AlbumCard.jsx'

function GrowthAlbum({ entries, child }) {
  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : []
  const childName = child?.name || 'ECHO'

  return (
    <section className="px-5 py-6">
      <header className="pt-2">
        <p className="text-xs font-black uppercase text-[#2f8b87]">Growth Album</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">成长相册</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#7a6a5c]">
          不是每天都有新照片。只有重要的人生节点，才值得被点亮。
        </p>
      </header>

      <div className="mt-6 rounded-[28px] bg-[#342b25] p-5 text-white shadow-glow">
        <p className="text-sm text-white/68">正在记录</p>
        <h2 className="mt-1 text-2xl font-black">{childName} 的人生时间线</h2>
      </div>

      <div className="mt-6 space-y-5">
        {safeEntries.length ? (
          safeEntries.map((entry, index) => (
            <AlbumCard key={entry.id || `album-entry-${index}`} entry={entry} isLast={index === safeEntries.length - 1} />
          ))
        ) : (
          <div className="rounded-[28px] bg-white p-6 text-center text-sm font-semibold text-[#8a7867] shadow-soft">
            成长相册正在同步。回到首页后再进入一次就会恢复。
          </div>
        )}
      </div>
    </section>
  )
}

export default GrowthAlbum
