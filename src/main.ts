import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './app/router'
import App from './app/App.vue'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
