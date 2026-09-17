const OBJECT_URL_LIFETIME_MS = 1000
const PRINT_FRAME_TIMEOUT_MS = 60000

export function downloadFile(contents: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS)
}

export function printHtml(html: string) {
  const frame = document.createElement('iframe')

  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'

  let removed = false
  const removeFrame = () => {
    if (removed) return
    removed = true
    frame.remove()
  }

  frame.addEventListener(
    'load',
    () => {
      const view = frame.contentWindow

      if (!view) {
        removeFrame()
        return
      }

      view.addEventListener('afterprint', removeFrame, { once: true })
      window.setTimeout(removeFrame, PRINT_FRAME_TIMEOUT_MS)
      view.focus()
      view.print()
    },
    { once: true },
  )

  frame.srcdoc = html
  document.body.append(frame)
}
