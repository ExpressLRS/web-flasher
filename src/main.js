import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import {createApp} from 'vue'
import {createVuetify} from 'vuetify'
import * as vertical from 'vuetify/labs/VStepperVertical'
import {VNumberInput} from 'vuetify/labs/VNumberInput'

import './main.css'
import App from './App.vue'

const vuetify = createVuetify({
    components: {...vertical, VNumberInput},
    theme: {
        defaultTheme: 'light'
    },
    defaults: {
        global: {
            density: "compact",
        },
        VBtn: {
            density: "default"
        }
    }
})

createApp(App)
    .use(vuetify)
    .mount('#app')
