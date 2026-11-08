// Paint the saved skin before React loads, so the first frame isn't the
// default theme flashing into theirs. This is an external file because
// the CSP is script-src 'self' with no inline hash. The app writes
// `buddyline:paint` (resolved CSS variables). Without it I fall back to
// the light/dark preset. I only apply keys that look like CSS variables
// or data attributes, so a tampered localStorage value can't set an
// arbitrary style or attribute.
try {
  var d = document.documentElement
  var p = JSON.parse(localStorage.getItem('buddyline:paint') || 'null')
  if (p && p.vars && p.attrs) {
    for (var k in p.vars) if (/^--[a-z0-9-]+$/.test(k)) d.style.setProperty(k, String(p.vars[k]))
    for (var a in p.attrs) if (/^[a-z]+$/.test(a)) d.dataset[a] = String(p.attrs[a])
    if (typeof p.px === 'number') d.style.fontSize = p.px + 'px'
  } else {
    var t = localStorage.getItem('buddyline:theme')
    if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    d.dataset.theme = t
  }
} catch (e) {
  document.documentElement.dataset.theme = 'light'
}
