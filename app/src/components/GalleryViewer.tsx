import { useEffect, useState } from 'react'
import type { GalleryResult } from '../../shared/types'

export default function GalleryViewer() {
  const [img, setImg] = useState<GalleryResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function next() {
    setLoading(true)
    const r = await window.api.galleryNext()
    setImg(r)
    setLoading(false)
  }

  useEffect(() => {
    void next()
  }, [])

  if (img?.empty) {
    return (
      <div className="gallery gallery-empty">
        <p>图片文件夹是空的～</p>
        <p className="hint">把图片放到：项目/图片/美图 或 项目/图片</p>
        <button onClick={() => window.api.closeGallery()}>关闭</button>
      </div>
    )
  }

  return (
    <div className="gallery">
      {img && <img className="gallery-img" src={img.url} alt={img.name} />}
      {loading && <div className="gallery-loading">加载中…</div>}
      <div className="gallery-bar">
        <span className="gallery-count">{img && !img.empty ? img.name : ''}</span>
        <button onClick={() => void next()}>再来一张</button>
        <button onClick={() => window.api.closeGallery()}>关闭</button>
      </div>
    </div>
  )
}
