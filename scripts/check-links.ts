import fs from 'node:fs/promises'
import path from 'node:path'

const DATA_PATH = path.resolve('data/friends.ts')
const OUTPUT_PATH = path.resolve('disconnected.json')
const CHECK_TIMEOUT = 15000
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

interface FriendLink {
  name: string
  description: string
  url: string
  avatar: string
  addDate?: string
  recommended?: boolean
  disconnected?: boolean
}

type LinkStatus = 'ok' | 'timeout' | 'error'

interface LinkCheckResult {
  name: string
  url: string
  avatar: string
  status?: LinkStatus
  httpStatus?: number
  responseTime?: number
  reason?: string
  avatarStatus?: LinkStatus
  avatarHttpStatus?: number
  avatarResponseTime?: number
}

interface DisconnectedInfo {
  name: string
  url: string
  reason: string
}

async function fetchUrl(url: string): Promise<{ ok: boolean; status: number; time: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

  try {
    const start = Date.now()
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 FriendLinkChecker/1.0' }
    })
    const time = Date.now() - start

    return {
      ok: res.ok,
      status: res.status,
      time
    }
  } finally {
    clearTimeout(timer)
  }
}

function parseFriendsTs(content: string): FriendLink[] {
  const match = content.match(/export const FRIEND_LINKS:\s*FriendLink\[\]\s*=\s*\[([\s\S]*?)\];/)
  if (!match) {
    throw new Error('无法解析 friends.ts 文件')
  }

  const arrayContent = match[1]
  const friends: FriendLink[] = []

  const objectRegex = /\{\s*name:\s*"([^"]+)",\s*description:\s*"([^"]+)",\s*url:\s*"([^"]+)",\s*avatar:\s*"([^"]+)"(?:,\s*addDate:\s*"([^"]*)")?(?:,\s*recommended:\s*(true|false))?(?:,\s*disconnected:\s*(true|false))?\s*\}/g

  let objMatch
  while ((objMatch = objectRegex.exec(arrayContent)) !== null) {
    friends.push({
      name: objMatch[1],
      description: objMatch[2],
      url: objMatch[3],
      avatar: objMatch[4],
      addDate: objMatch[5] || undefined,
      recommended: objMatch[6] === 'true' ? true : undefined,
      disconnected: objMatch[7] === 'true' ? true : undefined
    })
  }

  return friends
}

function generateFriendsTs(friends: FriendLink[]): string {
  const entries = friends.map(f => {
    let entry = `    {
        name: "${f.name}",
        description: "${f.description}",
        url: "${f.url}",
        avatar: "${f.avatar}"`
    
    if (f.addDate) {
      entry += `,
        addDate: "${f.addDate}"`
    }
    if (f.recommended) {
      entry += `,
        recommended: true`
    }
    if (f.disconnected) {
      entry += `,
        disconnected: true`
    }
    
    entry += `
    }`
    return entry
  })

  return `export interface FriendLink {
    name: string;
    description: string;
    url: string;
    avatar: string;
    addDate?: string;
    recommended?: boolean;
    disconnected?: boolean;
}

export const FRIEND_LINKS: FriendLink[] = [
${entries.join(',\n')},
];
`
}

async function checkLink(friend: FriendLink): Promise<LinkCheckResult> {
  const result: LinkCheckResult = {
    name: friend.name,
    url: friend.url,
    avatar: friend.avatar
  }

  if (friend.disconnected) {
    console.log(`[Check-Links] ${friend.name} 已标记为失联，跳过检测 🚫`)
    result.status = 'ok'
    result.responseTime = 0
    result.avatarStatus = 'ok'
    result.avatarResponseTime = 0
    return result
  }

  let lastError: Error | null = null

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await fetchUrl(friend.url)
      console.log(`[Check-Links] ${friend.name} URL 响应时间: ${res.time}ms ✨`)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      result.status = 'ok'
      result.httpStatus = res.status
      result.responseTime = res.time
      break
    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (i < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY * 2 ** i + Math.floor(Math.random() * 100)
        console.warn(
          `[Check-Links] ${friend.name} URL 重试 (${i + 1}/${MAX_RETRIES}) ${delay}ms 后重试: ${lastError.message} 😭`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  if (!result.status) {
    result.status = lastError?.name === 'AbortError' ? 'timeout' : 'error'
    result.reason = lastError?.message
    result.responseTime = 0
  }

  lastError = null
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await fetchUrl(friend.avatar)
      console.log(`[Check-Links] ${friend.name} Avatar 响应时间: ${res.time}ms ✨`)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      result.avatarStatus = 'ok'
      result.avatarHttpStatus = res.status
      result.avatarResponseTime = res.time
      break
    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (i < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY * 2 ** i + Math.floor(Math.random() * 100)
        console.warn(
          `[Check-Links] ${friend.name} Avatar 重试 (${i + 1}/${MAX_RETRIES}) ${delay}ms 后重试: ${lastError.message} 😭`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  if (!result.avatarStatus) {
    result.avatarStatus = lastError?.name === 'AbortError' ? 'timeout' : 'error'
    result.avatarResponseTime = 0
  }

  return result
}

async function main() {
  console.log('[Check-Links] 开始检测友链... ❤️')

  const content = await fs.readFile(DATA_PATH, 'utf-8')
  const friends = parseFriendsTs(content)

  console.log(`[Check-Links] 共发现 ${friends.length} 个友链`)

  const results: LinkCheckResult[] = []

  for (const friend of friends) {
    const result = await checkLink(friend)
    results.push(result)
  }

  const failed = results.filter(r => 
    (r.status !== 'ok' && !r.reason?.includes('已标记为失联')) || 
    r.avatarStatus !== 'ok'
  )

  if (failed.length > 0) {
    console.error(`[Check-Links] 发现 ${failed.length} 个问题友链 😡:`)
    
    const disconnectedList: DisconnectedInfo[] = []
    
    for (const f of failed) {
      const issues: string[] = []
      if (f.status !== 'ok') {
        issues.push(`URL: ${f.status}${f.reason ? ` (${f.reason})` : ''}`)
      }
      if (f.avatarStatus !== 'ok') {
        issues.push(`Avatar: ${f.avatarStatus}`)
      }
      console.error(`[Check-Links] - ${f.name}: ${issues.join(', ')}`)
      
      disconnectedList.push({
        name: f.name,
        url: f.url,
        reason: issues.join(', ')
      })
    }

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(disconnectedList, null, 2))
    console.log(`[Check-Links] 已保存失联信息到 ${OUTPUT_PATH}`)

    const updatedFriends = friends.map(f => {
      const result = results.find(r => r.name === f.name)
      if (result && (result.status !== 'ok' || result.avatarStatus !== 'ok')) {
        return { ...f, disconnected: true }
      }
      if (result?.status === 'ok' && result?.avatarStatus === 'ok' && f.disconnected) {
        const { disconnected, ...rest } = f
        return rest as FriendLink
      }
      return f
    })

    const hasChanges = updatedFriends.some((f, i) => 
      f.disconnected !== friends[i].disconnected
    )

    if (hasChanges) {
      await fs.writeFile(DATA_PATH, generateFriendsTs(updatedFriends))
      console.log('[Check-Links] 已更新 friends.ts 文件')
    }

    process.exit(1)
  }

  const recoveredFriends = friends.filter(f => f.disconnected)
  if (recoveredFriends.length > 0) {
    const updatedFriends = friends.map(f => {
      if (f.disconnected) {
        const { disconnected, ...rest } = f
        return rest as FriendLink
      }
      return f
    })
    await fs.writeFile(DATA_PATH, generateFriendsTs(updatedFriends))
    console.log(`[Check-Links] ${recoveredFriends.length} 个友链已恢复连接，已更新文件 ✅`)
  }

  console.log('[Check-Links] 所有友链状态正常 ✅')
}

main().catch(console.error)
