export function _(el) {
    return document.getElementById(el)
}

export function setDisplay(elementOrSelector, shown = true) {
    if (typeof elementOrSelector === 'string') {
        const elements = document.querySelectorAll(elementOrSelector)
        elements.forEach(element => {
            setClass(element, 'display--none', !shown)
        })
    } else if (typeof elementOrSelector === 'object') {
        setClass(elementOrSelector, 'display--none', !shown)
    }
}

export function setHidden(elementOrSelector, hidden = true) {
    if (typeof elementOrSelector === 'string') {
        const elements = document.querySelectorAll(elementOrSelector)
        elements.forEach(element => {
            element.hidden = hidden
        })
    } else if (typeof elementOrSelector === 'object') {
        elementOrSelector.hidden = hidden
    }
}

export function setClass(elementOrSelector, className, enabled = true) {
    const element = (typeof elementOrSelector === 'string') ? document.querySelector(elementOrSelector) : elementOrSelector

    if (enabled) {
        element.classList.add(className)
    } else {
        element.classList.remove(className)
    }
}

