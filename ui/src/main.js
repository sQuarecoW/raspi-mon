import { createApp } from 'vue'
import App from './App.vue'
import { io } from 'socket.io-client'
import VueSocketIOExt from 'vue-socket.io-extended'

const host = location.hostname
const socket = io('http://' + host + ':3000')

// Tailwind CSS
import '../build/output.css'

// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
import  { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
library.add(fas)

// lets vue!
createApp(App)
  .use(VueSocketIOExt, socket)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app')
