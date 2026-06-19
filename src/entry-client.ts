import { createSSRApp } from 'vue'
import SearchPage from './components/SearchPage.vue'
import Vue3Toastify from 'vue3-toastify'
import toastCss from 'vue3-toastify/dist/index.css?inline'

const style = document.createElement('style')
style.textContent = toastCss
document.head.appendChild(style)

const app = createSSRApp(SearchPage)
app.use(Vue3Toastify, { position: 'bottom-right', autoClose: 4000 })
app.mount('#app')
