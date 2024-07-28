import { _, setDisplay, setClass } from './helpers'

export class Stepper {
    constructor(steps) {
        this.steps = steps
        this.#set_step(1)
        for (let i = 1; i <= this.steps; i++) {
            _(`step-${i}`).onclick = (e) => {
                e.preventDefault()
                this.set(i)
            }
        }
    }

    #set_step(step) {
        this.step = step;
        for (let i = 1; i <= this.steps; i++) {
            setDisplay(`#step-${i}-panel`, i === step)
            setClass(`#step-${i}`, 'active', i <= step)
            setClass(`#step-${i}`, 'editable', i === step)
            setClass(`#step-${i}`, 'done', i < step)
        }
    }

    set(step) {
        if (_(`step-${step}`).classList.contains('active')) {
            this.#set_step(step)
        }
    }

    next() {
        this.#set_step(this.step + 1)
    }

    previous() {
        this.#set_step(this.step - 1)
    }
}

