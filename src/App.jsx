import {
  Baby,
  BookOpen,
  Camera,
  FileText,
  Heart,
  Home,
  MessageCircle,
  MoonStar,
  Orbit,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import roomImage from './assets/echo-room.png'
import GrowthAlbum from './components/GrowthAlbum.jsx'
import GrowthPreviewCard from './components/GrowthPreviewCard.jsx'

const STORAGE_KEY = 'project-echo-beta-state'
const MAX_PERSISTED_IMAGE_LENGTH = 450000

const personalities = [
  { id: 'gentle', name: '温柔', hint: '敏感、会照顾别人', tone: '轻轻地' },
  { id: 'curious', name: '好奇', hint: '爱问为什么', tone: '眼睛亮亮地' },
  { id: 'brave', name: '勇敢', hint: '愿意尝试新事物', tone: '认真地' },
  { id: 'dreamy', name: '梦幻', hint: '想象力很丰富', tone: '像讲秘密一样' },
]

const defaultState = {
  stage: 'splash',
  activeTab: 'home',
  child: {
    name: '',
    gender: 'girl',
    personality: 'gentle',
    photo: '',
    babyImage: '',
    age: 0,
    intimacy: 42,
    happiness: 68,
    growth: 8,
    dream: '还在梦里发光',
    worry: '怕你太忙忘记来看我',
  },
  messages: [],
  events: [],
  albumEntries: [],
  lastSeenUnlockedAlbumIds: [],
  newAlbumMoment: null,
  inventory: [],
}

const validStages = new Set(['splash', 'create', 'gestating', 'babyPreview', 'name', 'birth', 'app'])
const validTabs = new Set(['home', 'chat', 'events', 'album', 'shop', 'report'])

const imageGenerationService = {
  async generateBabyPreview({ parentPhoto, gender, personality }) {
    // Future integration point: call an image model with parentPhoto and ask for
    // a gentle baby-version portrait that preserves family resemblance.
    await new Promise((resolve) => setTimeout(resolve, 2800))
    return {
      imageUrl: '',
      provider: 'placeholder',
      promptContext: {
        intent: 'baby-version-from-parent-selfie',
        hasParentPhoto: Boolean(parentPhoto),
        gender,
        personality,
      },
    }
  },
}

function compressImageFile(file, maxSize = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const image = new Image()
      image.onerror = reject
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

const eventPool = [
  { tag: '上学', title: '第一次走进教室', text: 'ECHO 在门口回头看了你一眼，然后把小手举起来说：“我会勇敢。”', stat: 'growth' },
  { tag: '考试', title: '一张不完美的试卷', text: '分数没有想象中好，但 ECHO 学会了把错题收进小小的星星本。', stat: 'growth' },
  { tag: '朋友', title: '新朋友的午餐盒', text: '今天有人把草莓分给了 ECHO，亲密关系的世界变大了一点。', stat: 'happiness' },
  { tag: '失败', title: '积木塔倒下来了', text: 'ECHO 沉默了一会儿，然后问：“失败是不是也可以重新搭？”', stat: 'intimacy' },
  { tag: '梦想', title: '夜里的一句话', text: '睡前，ECHO 说以后想发明一种能保存拥抱的机器。', stat: 'happiness' },
]

const shopItems = [
  { id: 'milk', name: '星光牛奶', type: '食物', price: 12, effect: '+快乐' },
  { id: 'coat', name: '云朵外套', type: '衣服', price: 46, effect: '+亲密' },
  { id: 'tutor', name: '温柔补习班', type: '补习班', price: 88, effect: '+成长' },
  { id: 'camp', name: '月球夏令营', type: '夏令营', price: 120, effect: '+梦想' },
]

const albumMilestones = [
  { id: 'newborn', emoji: '👶', stage: '新生儿', title: '今天，你把我带到了这个世界。', unlockDay: 1, imageUrl: '' },
  { id: 'toddler', emoji: '🧒', stage: '幼儿', title: '我开始认识这个世界了。', unlockDay: 7, imageUrl: '' },
  { id: 'school', emoji: '🎒', stage: '第一次上学', title: '今天我第一次去学校。', unlockDay: 30, imageUrl: '' },
  { id: 'teen', emoji: '🧑', stage: '少年', title: '我开始有自己的想法了。', unlockDay: 90, imageUrl: '' },
  { id: 'graduation', emoji: '🧑‍🎓', stage: '毕业', title: '谢谢你一直陪伴我。', unlockDay: 180, imageUrl: '' },
  { id: 'adult', emoji: '👨', stage: '成人', title: '现在，换我关心你。', unlockDay: 365, imageUrl: '' },
]

function createAlbumEntries() {
  return albumMilestones.map((entry) => ({ ...entry, isUnlocked: entry.unlockDay === 1 }))
}

function getGrowthDay(createdAt) {
  if (!createdAt) return 1
  const elapsed = Date.now() - new Date(createdAt).getTime()
  return Math.max(1, Math.floor(elapsed / 86400000) + 1)
}

function hydrateAlbumEntries(savedEntries = [], currentDay = 1) {
  const safeSavedEntries = Array.isArray(savedEntries) ? savedEntries : []
  return albumMilestones.map((milestone, index) => {
    const saved = safeSavedEntries.find((entry) => entry.id === milestone.id) || {}
    const isUnlocked = currentDay >= milestone.unlockDay
    return {
      ...milestone,
      imageUrl: saved.imageUrl || milestone.imageUrl,
      isUnlocked,
      currentDay,
      previousUnlockDay: albumMilestones[index - 1]?.unlockDay ?? 1,
      unlockLabel: isUnlocked ? `Day ${milestone.unlockDay} 已解锁` : `Day ${milestone.unlockDay} 解锁`,
    }
  })
}

function loadState() {
  try {
    if (new URLSearchParams(window.location.search).get('reset') === '1') {
      localStorage.removeItem(STORAGE_KEY)
      window.history.replaceState({}, '', window.location.pathname)
      return defaultState
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    const child = { ...defaultState.child, ...parsed.child }
    const currentDay = getGrowthDay(child.createdAt)
    return {
      ...defaultState,
      ...parsed,
      stage: validStages.has(parsed.stage) ? parsed.stage : defaultState.stage,
      activeTab: validTabs.has(parsed.activeTab) ? parsed.activeTab : defaultState.activeTab,
      child,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      albumEntries: hydrateAlbumEntries(parsed.albumEntries, currentDay),
      lastSeenUnlockedAlbumIds: Array.isArray(parsed.lastSeenUnlockedAlbumIds) ? parsed.lastSeenUnlockedAlbumIds : [],
      newAlbumMoment: parsed.newAlbumMoment && typeof parsed.newAlbumMoment === 'object' ? parsed.newAlbumMoment : null,
    }
  } catch {
    return defaultState
  }
}

function createPersistableState(state) {
  const photo = state.child?.photo || ''
  const babyImage = state.child?.babyImage || ''

  return {
    ...state,
    child: {
      ...state.child,
      photo: photo.length <= MAX_PERSISTED_IMAGE_LENGTH ? photo : '',
      babyImage: babyImage.length <= MAX_PERSISTED_IMAGE_LENGTH ? babyImage : '',
    },
  }
}

function clamp(value) {
  return Math.max(0, Math.min(100, value))
}

function getPersonality(child) {
  return personalities.find((item) => item.id === child.personality) || personalities[0]
}

function createReply(child, text) {
  const persona = getPersonality(child)
  const ageLine =
    child.age < 3
      ? '我还小，但我听得懂你的声音。'
      : child.age < 12
        ? '今天我把这句话放进了记忆盒。'
        : child.age < 18
          ? '我好像开始懂一点点大人的世界了。'
          : '我会带着你的话，去做更好的选择。'

  if (text.includes('爱') || text.includes('想你')) {
    return `${persona.tone}说：我也爱你。${ageLine}`
  }
  if (text.includes('学习') || text.includes('考试')) {
    return `${persona.tone}说：那我今天多努力一点，但你也要陪我休息。`
  }
  if (text.includes('梦想')) {
    return `${persona.tone}说：我的梦想会变，可是想让你为我骄傲这件事不会变。`
  }
  return `${persona.tone}说：我记住了，“${text.slice(0, 18)}”。${ageLine}`
}

function App() {
  const [state, setState] = useState(loadState)
  const { child } = state
  const persona = useMemo(() => getPersonality(child), [child])
  const currentGrowthDay = useMemo(() => getGrowthDay(child.createdAt), [child.createdAt])
  const albumEntries = useMemo(() => hydrateAlbumEntries(state.albumEntries, currentGrowthDay), [state.albumEntries, currentGrowthDay])
  const seenAlbumIds = Array.isArray(state.lastSeenUnlockedAlbumIds) ? state.lastSeenUnlockedAlbumIds : []
  const nextAlbumEntry = albumEntries.find((entry) => !entry.isUnlocked)

  useEffect(() => {
    if (!child.createdAt) return
    const unlockedIds = albumEntries.filter((entry) => entry.isUnlocked).map((entry) => entry.id)
    const unseen = unlockedIds.filter((id) => !seenAlbumIds.includes(id) && id !== 'newborn')
    const hasAlbumDiff = JSON.stringify(state.albumEntries) !== JSON.stringify(albumEntries)
    if (!hasAlbumDiff && unseen.length === 0) return

    setState((current) => ({
      ...current,
      albumEntries,
      newAlbumMoment: unseen.length ? albumEntries.find((entry) => entry.id === unseen[0]) : current.newAlbumMoment,
    }))
  }, [child.createdAt, currentGrowthDay])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(createPersistableState(state)))
    } catch (error) {
      console.warn('ECHO local persistence failed, retrying with a smaller snapshot.', error)
      const fallbackState = {
        ...state,
        child: {
          ...state.child,
          photo: '',
          babyImage: '',
        },
        messages: state.messages.slice(-20),
        events: state.events.slice(0, 20),
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackState))
      } catch (fallbackError) {
        console.warn('ECHO local persistence fallback failed.', fallbackError)
      }
    }
  }, [state])

  const openAlbum = () => {
    setState((current) => ({
      ...current,
      activeTab: 'album',
      newAlbumMoment: null,
      lastSeenUnlockedAlbumIds: albumEntries.filter((entry) => entry.isUnlocked).map((entry) => entry.id),
    }))
  }

  const updateChild = (patch) => {
    setState((current) => ({ ...current, child: { ...current.child, ...patch } }))
  }

  const beginGestation = (photo) => {
    setState((current) => ({
      ...current,
      stage: 'gestating',
      child: { ...current.child, photo, babyImage: '' },
    }))
  }

  const completeGestation = async () => {
    const result = await imageGenerationService.generateBabyPreview({
      parentPhoto: child.photo,
      gender: child.gender,
      personality: child.personality,
    })
    setState((current) => ({
      ...current,
      stage: 'babyPreview',
      child: { ...current.child, babyImage: result.imageUrl },
    }))
  }

  const continueToName = () => {
    setState((current) => ({ ...current, stage: 'name' }))
  }

  const startBirth = () => {
    const firstName = child.name.trim() || 'ECHO'
    setState((current) => ({
      ...current,
      stage: 'birth',
      child: { ...current.child, name: firstName, createdAt: current.child.createdAt || new Date().toISOString() },
      albumEntries: hydrateAlbumEntries(createAlbumEntries(), 1),
      lastSeenUnlockedAlbumIds: ['newborn'],
      messages: [
        {
          from: 'child',
          text: `你好，我是 ${firstName}。你刚刚把我带到这个世界。`,
          time: '出生时刻',
        },
      ],
    }))
  }

  const enterHome = () => {
    setState((current) => {
      const createdAt = current.child.createdAt || new Date().toISOString()
      const growthDay = getGrowthDay(createdAt)
      const safeAlbumEntries = hydrateAlbumEntries(current.albumEntries?.length ? current.albumEntries : createAlbumEntries(), growthDay)
      return {
        ...current,
        stage: 'app',
        activeTab: 'home',
        child: { ...current.child, createdAt },
        albumEntries: safeAlbumEntries,
        lastSeenUnlockedAlbumIds: Array.isArray(current.lastSeenUnlockedAlbumIds) && current.lastSeenUnlockedAlbumIds.length ? current.lastSeenUnlockedAlbumIds : ['newborn'],
        newAlbumMoment: null,
      }
    })
  }

  const sendMessage = (text) => {
    if (!text.trim()) return
    const clean = text.trim()
    setState((current) => ({
      ...current,
      child: {
        ...current.child,
        intimacy: clamp(current.child.intimacy + 2),
        happiness: clamp(current.child.happiness + 1),
      },
      messages: [
        ...current.messages,
        { from: 'parent', text: clean, time: '刚刚' },
        { from: 'child', text: createReply(current.child, clean), time: '刚刚' },
      ],
    }))
  }

  const triggerEvent = () => {
    setState((current) => {
      const event = eventPool[Math.floor(Math.random() * eventPool.length)]
      const nextAge = Math.min(24, current.child.age + (current.events.length % 2 === 0 ? 1 : 0))
      return {
        ...current,
        child: {
          ...current.child,
          age: nextAge,
          [event.stat]: clamp(current.child[event.stat] + 7),
          dream: event.tag === '梦想' ? '发明能保存拥抱的机器' : current.child.dream,
          worry: event.tag === '失败' ? '担心自己不够好' : current.child.worry,
        },
        events: [{ ...event, id: crypto.randomUUID(), date: new Date().toLocaleDateString('zh-CN') }, ...current.events],
      }
    })
  }

  const buyItem = (item) => {
    setState((current) => ({
      ...current,
      inventory: [item, ...current.inventory],
      child: {
        ...current.child,
        happiness: clamp(current.child.happiness + (item.type === '食物' ? 5 : 2)),
        intimacy: clamp(current.child.intimacy + (item.type === '衣服' ? 4 : 1)),
        growth: clamp(current.child.growth + (item.type === '补习班' ? 6 : item.type === '夏令营' ? 4 : 1)),
        dream: item.type === '夏令营' ? '去很远的地方看星星' : current.child.dream,
      },
    }))
  }

  if (state.stage === 'splash') {
    return <Splash onStart={() => setState((current) => ({ ...current, stage: 'create' }))} />
  }

  if (state.stage === 'create') {
    return <Create child={child} persona={persona} updateChild={updateChild} onPhotoReady={beginGestation} />
  }

  if (state.stage === 'gestating') {
    return <Gestating child={child} onComplete={completeGestation} />
  }

  if (state.stage === 'babyPreview') {
    return <BabyPreview child={child} onContinue={continueToName} />
  }

  if (state.stage === 'name') {
    return <NameChild child={child} updateChild={updateChild} onBirth={startBirth} />
  }

  if (state.stage === 'birth') {
    return <Birth child={child} onEnter={enterHome} />
  }

  return (
    <Shell activeTab={state.activeTab} setActiveTab={(activeTab) => setState((current) => ({ ...current, activeTab }))}>
      {state.activeTab === 'home' && <HomeView child={child} persona={persona} triggerEvent={triggerEvent} latestEvent={state.events[0]} nextAlbumEntry={nextAlbumEntry} onOpenAlbum={openAlbum} />}
      {state.activeTab === 'chat' && <ChatView child={child} messages={state.messages} sendMessage={sendMessage} />}
      {state.activeTab === 'events' && <EventsView events={state.events} triggerEvent={triggerEvent} />}
      {state.activeTab === 'album' && <GrowthAlbum child={child} entries={albumEntries} />}
      {state.activeTab === 'shop' && <ShopView inventory={state.inventory} buyItem={buyItem} />}
      {state.activeTab === 'report' && <ReportView child={child} persona={persona} />}
      {state.newAlbumMoment && <GrowthMomentModal child={child} entry={state.newAlbumMoment} onView={openAlbum} />}
    </Shell>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown runtime error' }
  }

  componentDidCatch(error) {
    console.error('ECHO runtime error:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8ef] px-6 text-center text-[#342b25]">
        <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-soft">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0df]">
            <Sparkles className="h-7 w-7 text-[#ff8f68]" />
          </div>
          <h1 className="mt-5 text-2xl font-black">ECHO 需要重新同步</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#7a6a5c]">
            本地成长记录可能来自旧版本。重置后可以重新进入 Beta 体验。
          </p>
          <p className="mt-4 rounded-[16px] bg-[#fff5ea] p-3 text-xs font-semibold leading-relaxed text-[#9b5a42]">
            {this.state.message}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY)
              window.location.href = '/?reset=1'
            }}
            className="mt-6 w-full rounded-[22px] bg-[#342b25] px-5 py-4 font-black text-white"
          >
            重置并重新开始
          </button>
        </div>
      </main>
    )
  }
}

class InlineErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown runtime error' }
  }

  componentDidCatch(error) {
    console.error('ECHO view error:', error)
  }

  componentDidUpdate(previousProps) {
    if (this.props.resetKey !== previousProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: '' })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <section className="px-5 py-6">
        <div className="rounded-[28px] bg-white p-5 text-[#342b25] shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#fff0df] text-[#ff8f68]">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-black">这个页面刚刚打了个盹</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#7a6a5c]">
            ECHO 的核心记录还在。切换一下底部导航，或者刷新页面，就能继续。
          </p>
          <p className="mt-4 rounded-[16px] bg-[#fff5ea] p-3 text-xs font-semibold leading-relaxed text-[#9b5a42]">
            {this.state.message}
          </p>
        </div>
      </section>
    )
  }
}

function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

function Splash({ onStart }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff6ea] text-[#342b25]">
      <img src={roomImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,239,0.18),rgba(255,248,239,0.68)_48%,rgba(255,248,239,0.96))]" />
      <section className="relative flex min-h-screen flex-col justify-end px-6 pb-9 pt-14">
        <div className="mb-auto flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 shadow-soft backdrop-blur">
            <Orbit className="h-5 w-5 text-[#2f8b87]" />
          </div>
          <span className="rounded-full border border-white/70 bg-white/55 px-3 py-1 text-xs font-medium text-[#6b5c4e] backdrop-blur">Beta 0.1</span>
        </div>
        <div className="max-w-sm">
          <p className="mb-3 text-sm font-semibold text-[#2f8b87]">AI DIGITAL CHILD</p>
          <h1 className="text-5xl font-black leading-[0.95] tracking-normal text-[#2d2621]">Project ECHO</h1>
          <p className="mt-5 text-xl font-semibold leading-relaxed text-[#4b4037]">创造一个生命，然后陪他慢慢长大</p>
          <button onClick={onStart} className="mt-8 flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#342b25] px-5 py-4 text-base font-bold text-white shadow-glow">
            <Sparkles className="h-5 w-5" />
            开始创造
          </button>
        </div>
      </section>
    </main>
  )
}

function Create({ child, persona, updateChild, onPhotoReady }) {
  const handlePhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const compressedPhoto = await compressImageFile(file)
    onPhotoReady(compressedPhoto)
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] px-5 py-6 text-[#342b25]">
      <TopLabel title="创造档案" subtitle="给 ECHO 第一组生命参数" />
      <div className="mt-6 space-y-5">
        <label className="block rounded-[28px] border border-white bg-white/80 p-4 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[#f0dccb]">
              {child.photo ? <img src={child.photo} alt="用户照片" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-[#9b7b62]" />}
            </div>
            <div>
              <p className="font-bold">上传你的照片</p>
              <p className="mt-1 text-sm leading-relaxed text-[#7a6a5c]">未来可用于生成更贴近家庭记忆的成长影像。</p>
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>

        <ControlGroup title="孩子性别">
          {['girl', 'boy'].map((gender) => (
            <button
              key={gender}
              onClick={() => updateChild({ gender })}
              className={`rounded-[20px] px-5 py-3 text-sm font-bold ${child.gender === gender ? 'bg-[#342b25] text-white' : 'bg-white text-[#6b5c4e]'}`}
            >
              {gender === 'girl' ? '女孩' : '男孩'}
            </button>
          ))}
        </ControlGroup>

        <ControlGroup title="初始性格">
          <div className="grid grid-cols-2 gap-3">
            {personalities.map((item) => (
              <button
                key={item.id}
                onClick={() => updateChild({ personality: item.id })}
                className={`rounded-[22px] p-4 text-left ${child.personality === item.id ? 'bg-[#2f8b87] text-white shadow-soft' : 'bg-white text-[#342b25]'}`}
              >
                <p className="font-bold">{item.name}</p>
                <p className={`mt-1 text-xs ${child.personality === item.id ? 'text-white/78' : 'text-[#7a6a5c]'}`}>{item.hint}</p>
              </button>
            ))}
          </div>
        </ControlGroup>

        <div className="rounded-[28px] bg-[#342b25] p-5 text-white shadow-glow">
          <p className="text-sm text-white/70">当前生命倾向</p>
          <p className="mt-2 text-2xl font-black">{persona.name}型 ECHO</p>
          <p className="mt-2 text-sm leading-relaxed text-white/78">先上传你的自拍。ECHO 会先孕育出一个宝宝影像，然后你再为他取名字。</p>
        </div>
      </div>
    </main>
  )
}

function Gestating({ child, onComplete }) {
  const didStart = useRef(false)

  useEffect(() => {
    if (didStart.current) return
    didStart.current = true
    onComplete()
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1f2928] px-6 py-10 text-white">
      <img src={roomImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,184,117,0.5),transparent_34%),linear-gradient(180deg,rgba(31,41,40,0.08),rgba(31,41,40,0.96))]" />
      <section className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center text-center">
        <div className="relative flex h-72 w-72 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#ffd3a8]/24" />
          <div className="absolute inset-8 animate-pulseSoft rounded-full border border-white/25" />
          <div className="absolute left-6 top-1/2 h-3 w-20 -translate-y-1/2 animate-[float_2.6s_ease-in-out_infinite] rounded-full bg-white/70 shadow-[0_0_24px_rgba(255,255,255,0.65)]">
            <span className="absolute -right-3 -top-2 h-7 w-7 rounded-full bg-white shadow-[0_0_28px_rgba(255,255,255,0.9)]" />
          </div>
          <div className="absolute right-8 top-24 h-2 w-16 rotate-[-22deg] animate-[float_3.1s_ease-in-out_infinite] rounded-full bg-[#bff4ef]/70">
            <span className="absolute -left-3 -top-2 h-6 w-6 rounded-full bg-[#d8fffa] shadow-[0_0_22px_rgba(191,244,239,0.8)]" />
          </div>
          <div className="absolute bottom-20 right-10 h-2 w-14 rotate-[28deg] animate-[float_2.9s_ease-in-out_infinite] rounded-full bg-[#ffd3a8]/80">
            <span className="absolute -left-3 -top-2 h-6 w-6 rounded-full bg-[#fff1d8] shadow-[0_0_22px_rgba(255,211,168,0.9)]" />
          </div>
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[#fff1d8] shadow-[0_0_90px_rgba(255,203,150,0.95)]">
            <div className="absolute inset-3 animate-pulseSoft rounded-full border border-[#ff8f68]/35" />
            <div className="absolute inset-8 rounded-full bg-[#ff8f68]/18 blur-lg" />
            <div className="flex h-20 w-20 animate-born items-center justify-center overflow-hidden rounded-full bg-white/70">
              {child.photo ? <img src={child.photo} alt="" className="h-full w-full scale-150 object-cover opacity-45 blur-[2px]" /> : <Baby className="h-10 w-10 text-[#ff8f68]" />}
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm font-semibold text-[#ffd3a8]">GENESIS SIGNAL</p>
        <h1 className="mt-3 text-3xl font-black">正在孕育新生命...</h1>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/72">生命的第一道光正在形成。你的模样，会成为他的第一段记忆。</p>
      </section>
    </main>
  )
}

function BabyPreview({ child, onContinue }) {
  return (
    <main className="min-h-screen bg-[#fff8ef] px-5 py-6 text-[#342b25]">
      <TopLabel title="第一次看见他" subtitle="ECHO 的第一张生命影像" />
      <section className="mt-6 overflow-hidden rounded-[34px] bg-[#342b25] p-4 text-white shadow-glow">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_36%,#fff2d8,rgba(255,184,117,0.45)_34%,rgba(47,139,135,0.34)_72%)]">
          {child.photo && <img src={child.photo} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-20 blur-md" />}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,245,232,0.72),rgba(255,184,117,0.26)_44%,rgba(52,43,37,0.42)_100%)]" />
          {child.babyImage ? (
            <img src={child.babyImage} alt="AI generated baby preview" className="relative h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-white/72 shadow-[0_0_80px_rgba(255,255,255,0.72)]">
                <div className="absolute -inset-8 rounded-full border border-white/45" />
                <div className="absolute inset-4 rounded-full border border-[#ff8f68]/30" />
                {child.photo ? (
                  <div className="relative h-28 w-28 overflow-hidden rounded-full bg-[#fff0df]">
                    <img src={child.photo} alt="" className="h-full w-full scale-150 object-cover opacity-50 blur-[1.5px] saturate-75" />
                    <div className="absolute inset-0 flex items-center justify-center bg-[#fff0df]/48">
                      <Baby className="h-14 w-14 text-[#ff8f68]" />
                    </div>
                  </div>
                ) : (
                  <Baby className="h-16 w-16 text-[#ff8f68]" />
                )}
              </div>
              <p className="mt-8 rounded-full bg-white/18 px-4 py-2 text-xs font-bold text-white backdrop-blur">Baby-version Image Placeholder</p>
              <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-white/72">未来这里会由图像模型生成：保留你的部分五官气质，并转化为婴儿时期的模样。</p>
            </div>
          )}
          {child.photo && <img src={child.photo} alt="" className="absolute bottom-4 right-4 h-16 w-16 rounded-[20px] border-2 border-white/80 object-cover shadow-soft" />}
          <div className="absolute left-4 top-4 rounded-full bg-white/18 px-3 py-1 text-xs font-black text-white backdrop-blur">GENESIS COMPLETE</div>
        </div>
        <div className="px-2 py-5 text-center">
          <p className="text-2xl font-black leading-snug">他继承了你的一部分模样。</p>
          <p className="mt-3 text-lg font-semibold text-[#ffd3a8]">你愿意陪他长大吗？</p>
        </div>
      </section>
      <button onClick={onContinue} className="mt-6 flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#ff8f68] px-5 py-4 text-base font-black text-white shadow-glow">
        <Heart className="h-5 w-5" />
        我愿意，继续取名字
      </button>
    </main>
  )
}

function NameChild({ child, updateChild, onBirth }) {
  return (
    <main className="min-h-screen bg-[#fff8ef] px-5 py-6 text-[#342b25]">
      <TopLabel title="给他一个名字" subtitle="你已经见过他，现在为他留下第一个称呼" />
      <div className="mt-6 space-y-5">
        <div className="rounded-[32px] bg-white p-4 shadow-soft">
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-[34px] bg-[#fff0df]">
            <Baby className="h-16 w-16 text-[#ff8f68]" />
            {child.photo && <img src={child.photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm" />}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-4 shadow-soft">
          <p className="mb-3 text-sm font-bold text-[#6b5c4e]">孩子名字</p>
          <input
            value={child.name}
            onChange={(event) => updateChild({ name: event.target.value })}
            placeholder="例如：小回声"
            className="w-full rounded-[18px] bg-[#fff5ea] px-4 py-4 text-lg font-bold outline-none ring-1 ring-[#ead9c9] focus:ring-2 focus:ring-[#2f8b87]"
          />
        </div>
        <button onClick={onBirth} className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#342b25] px-5 py-4 text-base font-black text-white shadow-glow">
          <Wand2 className="h-5 w-5" />
          让 ECHO 诞生
        </button>
      </div>
    </main>
  )
}

function Birth({ child, onEnter }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1f2928] px-6 py-10 text-white">
      <img src={roomImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,184,117,0.44),transparent_34%),linear-gradient(180deg,rgba(31,41,40,0.2),rgba(31,41,40,0.94))]" />
      <section className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center text-center">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/30 animate-pulseSoft" />
          <div className="absolute inset-5 rounded-full border border-[#ffd3a8]/50 animate-pulseSoft" />
          <div className="flex h-24 w-24 animate-born items-center justify-center rounded-full bg-[#fff1d8] shadow-[0_0_70px_rgba(255,203,150,0.9)]">
            <Baby className="h-11 w-11 text-[#ff8f68]" />
          </div>
        </div>
        <p className="mt-8 text-sm font-semibold text-[#ffd3a8]">BIRTH SIGNAL FOUND</p>
        <h2 className="mt-3 text-4xl font-black">{child.name}</h2>
        <p className="mt-5 max-w-xs text-xl font-semibold leading-relaxed">“你好，我是 {child.name}。你刚刚把我带到这个世界。”</p>
        <button onClick={onEnter} className="mt-10 rounded-[24px] bg-white px-6 py-4 font-black text-[#342b25] shadow-glow">
          抱他回家
        </button>
      </section>
    </main>
  )
}

function Shell({ children, activeTab, setActiveTab }) {
  const tabs = [
    ['home', Home],
    ['chat', MessageCircle],
    ['events', Star],
    ['album', BookOpen],
    ['shop', ShoppingBag],
    ['report', FileText],
  ]
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fff8ef] pb-24 text-[#342b25] shadow-[0_0_80px_rgba(80,67,55,0.12)]">
      <InlineErrorBoundary resetKey={activeTab}>
        {children}
      </InlineErrorBoundary>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-white/80 bg-white/86 px-3 py-3 backdrop-blur-xl">
        <div className="grid grid-cols-6 gap-1">
          {tabs.map(([id, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex h-12 items-center justify-center rounded-[18px] ${activeTab === id ? 'bg-[#342b25] text-white' : 'text-[#8a7867]'}`}
              aria-label={id}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}

function HomeView({ child, persona, triggerEvent, latestEvent, nextAlbumEntry, onOpenAlbum }) {
  return (
    <section className="px-5 py-6">
      <TopLabel title={`${child.name} 的房间`} subtitle={`${child.age} 岁 · ${persona.name}型 · 正在成长`} />
      <div className="relative mt-5 overflow-hidden rounded-[32px] bg-[#342b25] shadow-glow">
        <img src={roomImage} alt="孩子房间" className="h-72 w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(52,43,37,0.88))]" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
            <MoonStar className="h-4 w-4" />
            今日情绪稳定发光
          </div>
          <h2 className="text-3xl font-black text-white">{child.name}</h2>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="亲密度" value={child.intimacy} />
        <Stat label="快乐值" value={child.happiness} />
        <Stat label="成长值" value={child.growth} />
      </div>
      <button onClick={triggerEvent} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#2f8b87] px-5 py-4 font-black text-white shadow-soft">
        <Sparkles className="h-5 w-5" />
        触发今日事件
      </button>
      <InlineErrorBoundary resetKey={`growth-preview-${nextAlbumEntry?.id || 'complete'}`}>
        <GrowthPreviewCard nextEntry={nextAlbumEntry} onOpen={onOpenAlbum} />
      </InlineErrorBoundary>
      {latestEvent && <EventCard event={latestEvent} />}
    </section>
  )
}

function ChatView({ child, messages, sendMessage }) {
  const [text, setText] = useState('')
  return (
    <section className="flex min-h-screen flex-col px-5 py-6">
      <TopLabel title="聊天区" subtitle={`${child.name} 会按年龄和性格回应你`} />
      <div className="no-scrollbar mt-5 flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((message, index) => (
          <div key={`${message.time}-${index}`} className={`flex ${message.from === 'parent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-[24px] px-4 py-3 shadow-soft ${message.from === 'parent' ? 'bg-[#342b25] text-white' : 'bg-white text-[#342b25]'}`}>
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          sendMessage(text)
          setText('')
        }}
        className="flex items-center gap-2 rounded-[24px] bg-white p-2 shadow-soft"
      >
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="和孩子说一句话" className="min-w-0 flex-1 bg-transparent px-3 py-3 outline-none" />
        <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ff8f68] text-white">
          <Send className="h-5 w-5" />
        </button>
      </form>
    </section>
  )
}

function EventsView({ events, triggerEvent }) {
  return (
    <section className="px-5 py-6">
      <TopLabel title="每日事件" subtitle="上学、考试、朋友、失败、梦想" />
      <button onClick={triggerEvent} className="mt-5 w-full rounded-[24px] bg-[#342b25] px-5 py-4 font-black text-white shadow-soft">
        生成新事件
      </button>
      <div className="mt-5 space-y-4">
        {events.length ? events.map((event) => <EventCard key={event.id} event={event} />) : <Empty text="还没有事件。让 ECHO 经历第一天。" />}
      </div>
    </section>
  )
}

function AlbumView({ child, unlocked }) {
  return (
    <section className="px-5 py-6">
      <TopLabel title="成长相册" subtitle="从婴儿到成人，每个阶段都会留下痕迹" />
      <div className="mt-5 space-y-4">
        {albumStages.map((stage) => {
          const isOpen = unlocked.includes(stage.age)
          return (
            <div key={stage.age} className={`overflow-hidden rounded-[28px] bg-white shadow-soft ${isOpen ? '' : 'opacity-55 grayscale'}`}>
              <div className="relative h-36">
                <img src={roomImage} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(52,43,37,0.78),rgba(52,43,37,0.12))]" />
                <div className="absolute left-4 top-4 text-white">
                  <p className="text-sm font-semibold">{stage.label}</p>
                  <h3 className="mt-1 text-2xl font-black">{isOpen ? child.name : '未解锁'}</h3>
                </div>
              </div>
              <p className="p-4 text-sm leading-relaxed text-[#6b5c4e]">{isOpen ? stage.note : `达到 ${stage.age} 岁后解锁。`}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ShopView({ inventory, buyItem }) {
  return (
    <section className="px-5 py-6">
      <TopLabel title="成长商城" subtitle="食物、衣服、补习班、夏令营" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {shopItems.map((item) => (
          <button key={item.id} onClick={() => buyItem(item)} className="rounded-[26px] bg-white p-4 text-left shadow-soft">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#fff0df] text-[#ff8f68]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-[#2f8b87]">{item.type}</p>
            <h3 className="mt-1 font-black">{item.name}</h3>
            <p className="mt-2 text-sm text-[#7a6a5c]">{item.effect} · {item.price} 星币</p>
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-[28px] bg-[#342b25] p-5 text-white shadow-soft">
        <p className="font-black">已拥有 {inventory.length} 件</p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{inventory[0] ? `最近购买：${inventory[0].name}` : '购买后会立即影响孩子状态。'}</p>
      </div>
    </section>
  )
}

function ReportView({ child, persona }) {
  return (
    <section className="px-5 py-6">
      <TopLabel title="家长报告" subtitle="理解孩子现在的内心" />
      <div className="mt-5 space-y-4">
        <ReportRow icon={Heart} label="性格" value={`${persona.name}：${persona.hint}`} />
        <ReportRow icon={Sparkles} label="梦想" value={child.dream} />
        <ReportRow icon={MoonStar} label="烦恼" value={child.worry} />
        <ReportRow icon={Home} label="亲密度" value={`${child.intimacy}/100，需要持续陪伴`} />
      </div>
    </section>
  )
}

function GrowthMomentModal({ child, entry, onView }) {
  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md items-center justify-center bg-[#1f2928]/88 px-6 text-white backdrop-blur-xl">
      <div className="w-full text-center">
        <div className="mx-auto flex h-28 w-28 animate-born items-center justify-center rounded-full bg-[#fff1d8] text-6xl shadow-[0_0_80px_rgba(255,203,150,0.85)]">
          {entry.emoji}
        </div>
        <p className="mt-8 text-sm font-black uppercase text-[#ffd3a8]">Growth Moment</p>
        <h2 className="mt-2 text-4xl font-black">成长时刻</h2>
        <p className="mx-auto mt-5 max-w-xs text-xl font-semibold leading-relaxed">
          {child.name || 'ECHO'} 长大了一些。
          <br />
          你想看看他的新模样吗？
        </p>
        <button onClick={onView} className="mt-9 w-full rounded-[24px] bg-white px-6 py-4 text-base font-black text-[#342b25] shadow-glow">
          查看照片
        </button>
      </div>
    </div>
  )
}

function TopLabel({ title, subtitle }) {
  return (
    <header className="pt-2">
      <p className="text-xs font-black uppercase text-[#2f8b87]">Project ECHO</p>
      <h1 className="mt-2 text-3xl font-black tracking-normal">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#7a6a5c]">{subtitle}</p>
    </header>
  )
}

function ControlGroup({ title, children }) {
  return (
    <div className="rounded-[28px] bg-[#f8ebdd] p-4">
      <p className="mb-3 text-sm font-bold text-[#6b5c4e]">{title}</p>
      {children}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[24px] bg-white p-3 shadow-soft">
      <p className="text-xs font-bold text-[#8a7867]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f0dccb]">
        <div className="h-full rounded-full bg-[#ff8f68]" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function EventCard({ event }) {
  return (
    <article className="mt-4 rounded-[28px] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#fff0df] px-3 py-1 text-xs font-black text-[#ff8f68]">{event.tag}</span>
        {event.date && <span className="text-xs font-semibold text-[#9b8a7c]">{event.date}</span>}
      </div>
      <h3 className="mt-4 text-xl font-black">{event.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#6b5c4e]">{event.text}</p>
    </article>
  )
}

function ReportRow({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-soft">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#e9f5f2] text-[#2f8b87]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-bold text-[#8a7867]">{label}</p>
      <p className="mt-1 text-lg font-black leading-relaxed">{value}</p>
    </div>
  )
}

function Empty({ text }) {
  return <div className="rounded-[28px] bg-white p-6 text-center text-sm font-semibold text-[#8a7867] shadow-soft">{text}</div>
}

export default RootApp
