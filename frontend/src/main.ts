import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import { initBackground } from './composables/useBackground'
import { waitForAuth } from './composables/useAuth'

initTheme()
initBackground()

const app = createApp(App)

app.use(router)

waitForAuth().then(() => {
  app.mount('#app')
})
