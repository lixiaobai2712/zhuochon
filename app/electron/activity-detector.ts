import { execFile } from 'node:child_process'
import { settingsStore } from './settings'
import { stateManager } from './state'

// 用一次 PowerShell 调用同时拿到：前台窗口标题、前台进程名、是否有 claude 相关进程。
const PS_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
$sig = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Fw {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
Add-Type -TypeDefinition $sig
$h = [Fw]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 1024
[Fw]::GetWindowText($h, $sb, $sb.Capacity) | Out-Null
$fgTitle = $sb.ToString()
$pid2 = 0
[Fw]::GetWindowThreadProcessId($h, [ref]$pid2) | Out-Null
$proc = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
$fgProc = ''
if ($proc) { $fgProc = $proc.ProcessName }
$hasClaude = $false
Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|claude|bun|deno' } | ForEach-Object {
  if ($_.Name -match 'claude') { $hasClaude = $true }
  if ($_.CommandLine -match 'claude') { $hasClaude = $true }
}
$o = [PSCustomObject]@{ title = $fgTitle; proc = $fgProc; hasClaude = $hasClaude } | ConvertTo-Json -Compress
Write-Output $o
`

function lastJsonLine(out: string): any {
  const lines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i])
    } catch {
      /* skip */
    }
  }
  return null
}

function execPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 6000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err)
        resolve(stdout)
      },
    )
  })
}

const TERMINAL_NAMES = [
  'windowsterminal',
  'powershell',
  'pwsh',
  'cmd',
  'conhost',
  'bash',
  'gitbash',
  'windows_terminal',
  'wezterm',
  'alacritty',
  'hyper',
  'tabby',
]

export type DetectedSource = 'claude' | 'codex' | null

export async function detectActivity(): Promise<DetectedSource> {
  try {
    const out = await execPowerShell(PS_SCRIPT)
    const j = lastJsonLine(out)
    if (!j) return null
    const title = String(j.title || '').toLowerCase()
    const proc = String(j.proc || '').toLowerCase()

    const isTerminal =
      TERMINAL_NAMES.some((s) => proc.includes(s)) ||
      ['windowsterminal', 'cmd', 'powershell', 'conhost'].some((s) => title.includes(s))

    // Claude：前台标题含 claude，或前台是终端且存在 claude 进程
    if (title.includes('claude')) return 'claude'
    if (j.hasClaude && isTerminal) return 'claude'

    // Codex：前台标题包含 Codex / ChatGPT / OpenAI
    if (title.includes('codex') || title.includes('chatgpt') || title.includes('openai')) {
      return 'codex'
    }
    return null
  } catch {
    return null
  }
}

const SLEEP_TIMEOUT = 10 * 60 * 1000 // 10 分钟无活动进入睡眠

export class ActivityWatcher {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastActive = Date.now()

  start() {
    this.lastActive = Date.now()
    this.timer = setInterval(() => void this.tick(), 2000)
    void this.tick()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** 点击/打开图库等手动交互时调用，重置睡眠计时 */
  poke() {
    this.lastActive = Date.now()
  }

  private async tick() {
    const s = settingsStore.get()
    // 手动状态或关闭自动检测时，不干预
    if (s.manualState !== 'auto') return

    const det = await detectActivity()
    if (det === 'claude') {
      this.lastActive = Date.now()
      stateManager.setAction('claude-working')
    } else if (det === 'codex') {
      this.lastActive = Date.now()
      stateManager.setAction('codex-working')
    } else {
      if (Date.now() - this.lastActive >= SLEEP_TIMEOUT) stateManager.setAction('sleep')
      else stateManager.setAction('idle')
    }
  }
}

export const activityWatcher = new ActivityWatcher()
