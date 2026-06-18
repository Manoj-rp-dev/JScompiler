document.addEventListener('DOMContentLoaded', () => {
  const runBtn = document.getElementById('run-btn')
  const consoleOutput = document.getElementById('console-output')
  const themeToggle = document.getElementById('theme-toggle')
  const sunIcon = document.getElementById('sun-icon')
  const moonIcon = document.getElementById('moon-icon')
  const resizer = document.getElementById('resizer')
  const editorPane = document.querySelector('.editor-pane')
  const consolePane = document.querySelector('.console-pane')
  const mainContent = document.querySelector('.main-content')

  let editorInstance = null

  require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }})
  
  require(['vs/editor/editor.main'], function() {
    const isDark = document.body.classList.contains('dark-theme')
    
    const initEditor = () => {
      editorInstance = monaco.editor.create(document.getElementById('monaco-editor-container'), {
        value: 'console.log("hello world")\n\nlet x = 10\nlet y = 20\nconsole.log(x + y)\n',
        language: 'javascript',
        theme: isDark ? 'vs-dark' : 'vs',
        fontFamily: "'Ubuntu Mono', 'Fira Code', monospace",
        fontSize: 16,
        minimap: { enabled: false },
        automaticLayout: true,
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        folding: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        renderLineHighlight: "none",
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        scrollbar: {
          vertical: "hidden",
          horizontal: "hidden"
        },
        matchBrackets: "never"
      })

      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
        window.runCode()
      })
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(initEditor)
    } else {
      initEditor()
    }
  })

  const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-theme')
    if (isDark) {
      document.body.classList.remove('dark-theme')
      sunIcon.style.display = 'none'
      moonIcon.style.display = 'block'
      localStorage.setItem('theme', 'light')
      if (editorInstance) monaco.editor.setTheme('vs')
    } else {
      document.body.classList.add('dark-theme')
      sunIcon.style.display = 'block'
      moonIcon.style.display = 'none'
      localStorage.setItem('theme', 'dark')
      if (editorInstance) monaco.editor.setTheme('vs-dark')
    }
  }

  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme')
    sunIcon.style.display = 'none'
    moonIcon.style.display = 'block'
  } else {
    sunIcon.style.display = 'block'
    moonIcon.style.display = 'none'
  }

  themeToggle.addEventListener('click', toggleTheme)

  let isResizing = false

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true
    document.body.style.cursor = 'col-resize'
    document.getElementById('monaco-editor-container').style.pointerEvents = 'none'
  })

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return
    
    const containerWidth = mainContent.getBoundingClientRect().width
    let newWidth = ((e.clientX - mainContent.getBoundingClientRect().left) / containerWidth) * 100
    if (newWidth < 20) newWidth = 20
    if (newWidth > 80) newWidth = 80

    editorPane.style.flex = `1 1 ${newWidth}%`
    consolePane.style.flex = `1 1 ${100 - newWidth}%`
  })

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false
      document.body.style.cursor = 'default'
      document.getElementById('monaco-editor-container').style.pointerEvents = 'auto'
    }
  })

  const formatOutput = (arg) => {
    if (typeof arg === 'string') return `<span class="type-string">"${arg}"</span>`
    if (typeof arg === 'number') return `<span class="type-number">${arg}</span>`
    if (typeof arg === 'boolean') return `<span class="type-boolean">${arg}</span>`
    if (typeof arg === 'function') return `<span class="type-function">[Function: ${arg.name || 'anonymous'}]</span>`
    if (arg === null) return `<span class="type-object">null</span>`
    if (arg === undefined) return `<span class="type-object">undefined</span>`
    if (Array.isArray(arg)) {
      const items = arg.map(a => formatOutput(a)).join(', ')
      return `<span class="type-object">[${items}]</span>`
    }
    if (typeof arg === 'object') {
      try {
        const json = JSON.stringify(arg, null, 2)
        return `<span class="type-object">${json}</span>`
      } catch (e) {
        return `<span class="type-object">[Object]</span>`
      }
    }
    return arg
  }

  const escapeHtml = (unsafe) => {
      return unsafe
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;")
  }

  const appendToConsole = (type, ...args) => {
    const line = document.createElement('div')
    line.className = `console-line ${type}`
    
    let outputText = ''
    
    if (type === 'error') {
      outputText = args[0] instanceof Error ? args[0].toString() : args.join(' ')
      outputText = escapeHtml(outputText)
    } else {
      outputText = args.map(arg => {
        if (type === 'log' || type === 'info' || type === 'warn') {
           if (typeof arg === 'string') return escapeHtml(arg)
           return formatOutput(arg)
        }
        return formatOutput(arg)
      }).join(' ')
    }

    line.innerHTML = outputText
    consoleOutput.appendChild(line)
    consoleOutput.scrollTop = consoleOutput.scrollHeight
  }

  const runCode = () => {
    if (!editorInstance) return
    const code = editorInstance.getValue()
    if (!code.trim()) return

    appendToConsole('info', '> Running code...')
    
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      clear: console.clear
    }

    console.log = (...args) => {
      appendToConsole('log', ...args)
      originalConsole.log(...args)
    }
    console.error = (...args) => {
      appendToConsole('error', ...args)
      originalConsole.error(...args)
    }
    console.warn = (...args) => {
      appendToConsole('warn', ...args)
      originalConsole.warn(...args)
    }
    console.info = (...args) => {
      appendToConsole('info', ...args)
      originalConsole.info(...args)
    }
    console.clear = () => {
      consoleOutput.innerHTML = ''
      if(originalConsole.clear) originalConsole.clear()
    }

    try {
      const execute = new Function(code)
      execute()
    } catch (error) {
      console.error(error)
    } finally {
      console.log = originalConsole.log
      console.error = originalConsole.error
      console.warn = originalConsole.warn
      console.info = originalConsole.info
      console.clear = originalConsole.clear
    }
  }

  window.runCode = runCode

  runBtn.addEventListener('click', runCode)
})
