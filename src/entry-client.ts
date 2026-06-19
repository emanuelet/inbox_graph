import { createSSRApp } from 'vue'
import SearchPage from './components/SearchPage.vue'
import Toast, { POSITION } from 'vue-toastification'
import toastCss from 'vue-toastification/dist/index.css?inline'

const style = document.createElement('style')
style.textContent = toastCss
document.head.appendChild(style)

const app = createSSRApp(SearchPage)
app.use(Toast, { position: POSITION.BOTTOM_RIGHT, timeout: 4000 })
app.mount('#app')
