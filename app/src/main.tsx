import { createRoot } from 'react-dom/client'
import App from './App'
import GalleryViewer from './components/GalleryViewer'
import './styles/global.css'

const isGallery = new URLSearchParams(window.location.search).get('view') === 'gallery'

const root = createRoot(document.getElementById('root')!)
root.render(isGallery ? <GalleryViewer /> : <App />)
