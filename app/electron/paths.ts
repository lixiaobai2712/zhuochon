import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

function firstExisting(...cands: string[]): string | null {
  for (const c of cands) {
    if (fs.existsSync(c)) return c
  }
  return null
}

/**
 * 解析素材目录。
 * 兼容两套布局：
 *   a) 角色/自定义1/xxx.gif
 *   b) 图片/角色/xxx.gif  （当前实际布局）
 * 随机美图：图片/美图 优先，其次 图片。
 */
export function getPaths() {
  const appRoot = app.getAppPath()
  const projectRoot = process.env.PET_ROOT || path.resolve(appRoot, '..')

  const roleRoots =
    process.env.PET_ROLES
      ? [process.env.PET_ROLES]
      : [
          path.join(projectRoot, '角色'),
          path.join(projectRoot, '图片', '角色'),
        ].filter((p) => fs.existsSync(p))

  const galleryRoot =
    process.env.PET_GALLERY ||
    firstExisting(
      path.join(projectRoot, '图片', '美图'),
      path.join(projectRoot, '图片'),
    ) ||
    path.join(projectRoot, '图片')

  return { projectRoot, roleRoots, galleryRoot }
}
