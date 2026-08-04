# 桌面小宠（Desktop Pet）

Windows 桌面宠物。透明、无边框、默认置顶、可拖拽。能根据 **Codex 桌面端** 和 **Claude Code 命令行** 的活动状态自动切换动作，双击随机展示一张本地美图。

技术栈：**Electron + React + TypeScript + Vite**。

## 目录结构

```text
桌宠/
  app/                # 项目代码（本目录）
    electron/         # 主进程
    src/              # 渲染进程（React）
    shared/           # 主进程/渲染进程共享类型
    scripts/          # 工具脚本（生成托盘图标）
    resources/        # 托盘图标
 角色/                # 可选：角色文件夹（每个角色一个子文件夹）
 图片/
   角色/              # 当前实际使用的角色素材（中文命名，配合 pet.config.json）
   美图/              # 随机美图素材
```

## 如何安装依赖

```bash
cd app
npm install
```

> 第一次 `npm install` 会下载 Electron 二进制，可能要等一会。

## 如何启动（开发）

```bash
cd app
npm run dev
```

桌宠会出现在屏幕上：透明、置顶、可拖拽。右键右下角托盘图标可以调出完整菜单。

## 如何打包

```bash
cd app
npm run build
```

构建产物在 `app/dist`（渲染层）和 `app/dist-electron`（主进程）。

```bash
npm start   # 在构建后直接运行
```

> 当前版本未配置 electron-builder 安装包打包。如需发布 .exe 安装包，可以后续补充 `electron-builder`。

## 角色系统

### 添加角色

方式一（推荐，与计划一致）：在项目根目录新建角色文件夹：

```text
角色/
  自定义1/
    idle.gif
    codex-working.gif
    claude-working.gif
    sleep.gif
    click.gif
    success.gif
    error.gif
```

放好图片后，在托盘菜单点「刷新角色列表」，即可切换。

方式二：当前项目实际使用的是 `图片/角色/`，里面直接放素材 + 一个 `pet.config.json`，把文件名映射到动作：

```json
{
  "id": "custom-1",
  "name": "自定义1",
  "actions": {
    "idle": "思考1.jpeg",
    "codex-working": "开始执行4.gif",
    "claude-working": "开始执行2.gif",
    "sleep": "等待输入.jpeg",
    "click": "思考2.jpeg",
    "success": "任务完成1.jpg",
    "error": "失败.png"
  }
}
```

### 动作图命名规则（无配置时自动匹配）

| 动作 | 文件名关键词（可中文） |
| --- | --- |
| `idle` | `idle`、`思考`、`等待`、`待机` |
| `codex-working` | `codex`、`working`、`开始执行`、`执行` |
| `claude-working` | `claude`、`working`、`开始执行`、`执行` |
| `sleep` | `sleep`、`睡觉`、`zzz` |
| `click` | `click`、`点击`、`touch` |
| `success` | `success`、`完成`、`done`、`成功` |
| `error` | `error`、`失败`、`fail`、`错误` |

支持的格式：`.png` `.jpg` `.jpeg` `.webp` `.gif`。动画类动作（idle / working / sleep / click）优先选 `.gif`。**某个动作缺少图片时自动回退到 `idle`**。

## 随机美图

把图片放进 `图片/美图/`（或 `图片/`）。**双击桌宠**会弹窗询问「来一张好看的图片？」，确认后随机展示一张。图库窗口支持「再来一张」和「关闭」。

## Codex / Claude 检测原理

主进程 `electron/activity-detector.ts` 每 2 秒跑一次 PowerShell：

- 通过 Win32 API（`GetForegroundWindow`）拿到**前台窗口标题和进程名**
- 前台标题含 `codex` / `chatgpt` / `openai` → 状态设为 `codex-working`
- 前台是终端（Windows Terminal / PowerShell / CMD / Git Bash …）**且**存在命令行含 `claude` 的进程 → 状态设为 `claude-working`
- **优先级：Claude > Codex > idle**
- 超过 **10 分钟**没有 Codex/Claude 活动 → 状态变为 `sleep`（点击/打开图库会重置计时）

每轮检测都有 6 秒超时保护；检测失败时静默忽略，不影响桌宠运行。

## 当前限制

- 检测基于「前台窗口」，不是进程 CPU 占用，因此「正在后台跑任务」不会计入活动（与计划一致，按窗口检测）
- `sleep` 依赖 10 分钟无 Codex/Claude 活动的设定，且用户手动点击可重置
- 气泡是覆盖在桌宠窗口内的简易气泡，窗口外溢出部分会被裁剪
- `launchAtStartup`（开机自启）默认关闭，需要在托盘菜单手动打开；开发模式下打开它指向的是 electron.exe
- 未做 electron-builder 安装包，素材目录通过相对路径（`app/..`）定位，未随包分发
- 单个动作图只支持「一张图或一个 gif」，不支持多帧序列动画播放
