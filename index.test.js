let { equal } = require('uvu/assert')
let { test } = require('uvu')
let postcss = require('postcss')

let plugin = require('./')

function run(input, output, opts) {
  let result = postcss([plugin(opts)]).process(input, { from: undefined })
  equal(result.css, output)
  equal(result.warnings().length, 0)
}

test('replaces selectors - dark scheme', () => {
  run(
    `@media (prefers-color-scheme:dark) {
    html.is-a,
    html,
    :root,
    a { }
  }`,
    `@media (prefers-color-scheme:dark) {
    html:where(:not(.is-light)).is-a,
    html:where(:not(.is-light)),
    :root:where(:not(.is-light)),
    :where(html:not(.is-light)) a { }
  }
    html:where(.is-dark).is-a,
    html:where(.is-dark),
    :root:where(.is-dark),
    :where(html.is-dark) a { }`
  )
})

test('replaces selectors - light scheme', () => {
  run(
    `@media (prefers-color-scheme:light) {
    html.is-a,
    html,
    :root,
    a { }
  }`,
    `@media (prefers-color-scheme:light) {
    html:where(:not(.is-dark)).is-a,
    html:where(:not(.is-dark)),
    :root:where(:not(.is-dark)),
    :where(html:not(.is-dark)) a { }
  }
    html:where(.is-light).is-a,
    html:where(.is-light),
    :root:where(.is-light),
    :where(html.is-light) a { }`
  )
})

test('replaces selectors - dark and light schemes', () => {
  run(
    `@media (prefers-color-scheme:dark) {
    html.is-a,
    html,
    :root,
    a { }
  }
  @media (prefers-color-scheme:light) {
    html.is-a,
    html,
    :root,
    a { }
  }`,
    `@media (prefers-color-scheme:dark) {
    html:where(:not(.is-light)).is-a,
    html:where(:not(.is-light)),
    :root:where(:not(.is-light)),
    :where(html:not(.is-light)) a { }
  }
    html:where(.is-dark).is-a,
    html:where(.is-dark),
    :root:where(.is-dark),
    :where(html.is-dark) a { }
  @media (prefers-color-scheme:light) {
    html:where(:not(.is-dark)).is-a,
    html:where(:not(.is-dark)),
    :root:where(:not(.is-dark)),
    :where(html:not(.is-dark)) a { }
  }
  html:where(.is-light).is-a,
    html:where(.is-light),
    :root:where(.is-light),
    :where(html.is-light) a { }`
  )
})

test('disables :where() of request - dark scheme', () => {
  run(
    `@media (prefers-color-scheme:dark) {
    html.is-a,
    html,
    :root,
    a { }
  }`,
    `@media (prefers-color-scheme:dark) {
    html:not(.is-light).is-a,
    html:not(.is-light),
    :root:not(.is-light),
    html:not(.is-light) a { }
  }
    html.is-dark.is-a,
    html.is-dark,
    :root.is-dark,
    html.is-dark a { }`,
    { useWhere: false }
  )
})

test('disables :where() of request - light scheme', () => {
  run(
    `@media (prefers-color-scheme:light) {
    html.is-a,
    html,
    :root,
    a { }
  }`,
    `@media (prefers-color-scheme:light) {
    html:not(.is-dark).is-a,
    html:not(.is-dark),
    :root:not(.is-dark),
    html:not(.is-dark) a { }
  }
    html.is-light.is-a,
    html.is-light,
    :root.is-light,
    html.is-light a { }`,
    { useWhere: false }
  )
})

test('processes inner at-rules - dark scheme', () => {
  run(
    `@media (prefers-color-scheme: dark) {
    @media (min-width: 500px) {
      a { }
    }
    @media (min-width: 500px) {
      @media (print) {
        a { }
      }
    }
  }`,
    `@media (prefers-color-scheme: dark) {
    @media (min-width: 500px) {
      :where(html:not(.is-light)) a { }
    }
    @media (min-width: 500px) {
      @media (print) {
        :where(html:not(.is-light)) a { }
      }
    }
  }
    @media (min-width: 500px) {
      :where(html.is-dark) a { }
    }
    @media (min-width: 500px) {
      @media (print) {
        :where(html.is-dark) a { }
      }
    }`
  )
})

test('processes inner at-rules - light scheme', () => {
  run(
    `@media (prefers-color-scheme: light) {
    @media (min-width: 500px) {
      a { }
    }
    @media (min-width: 500px) {
      @media (print) {
        a { }
      }
    }
  }`,
    `@media (prefers-color-scheme: light) {
    @media (min-width: 500px) {
      :where(html:not(.is-dark)) a { }
    }
    @media (min-width: 500px) {
      @media (print) {
        :where(html:not(.is-dark)) a { }
      }
    }
  }
    @media (min-width: 500px) {
      :where(html.is-light) a { }
    }
    @media (min-width: 500px) {
      @media (print) {
        :where(html.is-light) a { }
      }
    }`
  )
})

test('checks media params deeply', () => {
  run(
    `@media (x-dark: true) {
    a { color: white }
  }
  @unknown (prefers-color-scheme: dark) {
    a { color: white }
  }`,
    `@media (x-dark: true) {
    a { color: white }
  }
  @unknown (prefers-color-scheme: dark) {
    a { color: white }
  }`
  )
})

test('ignores whitespaces', () => {
  run(
    `@media ( prefers-color-scheme:dark ) {
    a { color: white }
  }`,
    `@media ( prefers-color-scheme:dark ) {
    :where(html:not(.is-light)) a { color: white }
  }
    :where(html.is-dark) a { color: white }`
  )
})

test('reserve comments', () => {
  run(
    `@media (prefers-color-scheme:dark) {
    /* a */
    a { color: white }
    @media (min-width: 500px) { /* b */ a { } }
  }`,
    `@media (prefers-color-scheme:dark) {
    /* a */
    :where(html:not(.is-light)) a { color: white }
    @media (min-width: 500px) { /* b */ :where(html:not(.is-light)) a { } }
  }
    /* a */
    :where(html.is-dark) a { color: white }
    @media (min-width: 500px) { /* b */ :where(html.is-dark) a { } }`
  )
})

test('supports combined queries - dark scheme', () => {
  run(
    `@media (min-width: 60px) and (prefers-color-scheme: dark) {
    a { color: white }
  }`,
    `@media (min-width: 60px) and (prefers-color-scheme: dark) {
    :where(html:not(.is-light)) a { color: white }
  }@media (min-width: 60px) {
    :where(html.is-dark) a { color: white }
  }`
  )
})

test('supports combined queries - light scheme', () => {
  run(
    `@media (min-width: 60px) and (prefers-color-scheme: light) {
    a { color: white }
  }`,
    `@media (min-width: 60px) and (prefers-color-scheme: light) {
    :where(html:not(.is-dark)) a { color: white }
  }@media (min-width: 60px) {
    :where(html.is-light) a { color: white }
  }`
  )
})

test('supports combined queries in the middle - dark scheme', () => {
  run(
    `@media (width > 0) and (prefers-color-scheme: dark) and (width > 0) {
    a { color: white }
  }`,
    `@media (width > 0) and (prefers-color-scheme: dark) and (width > 0) {
    :where(html:not(.is-light)) a { color: white }
  }@media (width > 0) and (width > 0) {
    :where(html.is-dark) a { color: white }
  }`
  )
})

test('supports combined queries in the middle - light scheme', () => {
  run(
    `@media (width > 0) and (prefers-color-scheme: light) and (width > 0) {
    a { color: white }
  }`,
    `@media (width > 0) and (prefers-color-scheme: light) and (width > 0) {
    :where(html:not(.is-dark)) a { color: white }
  }@media (width > 0) and (width > 0) {
    :where(html.is-light) a { color: white }
  }`
  )
})

test('allows to change class', () => {
  run(
    `@media (prefers-color-scheme: dark) {
    a { color: white }
  }`,
    `@media (prefers-color-scheme: dark) {
    :where(html:not(.light-theme)) a { color: white }
  }
    :where(html.dark-theme) a { color: white }`,
    { darkSelector: '.dark-theme', lightSelector: '.light-theme' }
  )
})

test('changes root selectors', () => {
  run(
    `@media (prefers-color-scheme: dark) {
    html, .s { --bg: black }
    p { color: white }
  }
  html, .s { --bg: white }
  p { color: black }`,
    `@media (prefers-color-scheme: dark) {
    html:where(:not(.is-light)), .s:where(:not(.is-light)) { --bg: black }
    :where(html:not(.is-light)) p,:where(.s:not(.is-light)) p { color: white }
  }
    html:where(.is-dark), .s:where(.is-dark) { --bg: black }
    :where(html.is-dark) p,:where(.s.is-dark) p { color: white }
  html, .s { --bg: white }
  p { color: black }`,
    { rootSelector: ['html', ':root', '.s'] }
  )
})

test('changes root selector', () => {
  run(
    `@media (prefers-color-scheme: dark) {
    body { --bg: black }
    p { color: white }
  }
  body { --bg: white }
  p { color: black }`,
    `@media (prefers-color-scheme: dark) {
    body:where(:not(.is-light)) { --bg: black }
    :where(body:not(.is-light)) p { color: white }
  }
    body:where(.is-dark) { --bg: black }
    :where(body.is-dark) p { color: white }
  body { --bg: white }
  p { color: black }`,
    { rootSelector: 'body' }
  )
})

test('ignores already transformed rules - dark scheme', () => {
  run(
    `@media (prefers-color-scheme: dark) {
    :root:not(.is-light) { --bg: black }
    p { color: white }
  }
  :root { --bg: white }`,
    `@media (prefers-color-scheme: dark) {
    :root:not(.is-light) { --bg: black }
    :where(html:not(.is-light)) p { color: white }
  }
    :where(html.is-dark) p { color: white }
  :root { --bg: white }`
  )
})

test('ignores already transformed rules - light scheme', () => {
  run(
    `@media (prefers-color-scheme: light) {
    :root:not(.is-dark) { --bg: black }
    p { color: white }
  }
  :root { --bg: white }`,
    `@media (prefers-color-scheme: light) {
    :root:not(.is-dark) { --bg: black }
    :where(html:not(.is-dark)) p { color: white }
  }
    :where(html.is-light) p { color: white }
  :root { --bg: white }`
  )
})

test.run()
