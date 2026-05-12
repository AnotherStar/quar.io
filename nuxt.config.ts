// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt', '@nuxt/icon'],
  icon: {
    // Lucide is the default icon collection — minimal line icons, Notion-style.
    // Use as <Icon name="lucide:bold" /> anywhere.
    serverBundle: { collections: ['lucide'] }
  },
  // Disable path-prefixing so components/editor/InstructionEditor.vue is
  // available as <InstructionEditor>, not <EditorInstructionEditor>.
  components: [{ path: '~/components', pathPrefix: false }],
  devServer: { port: 4200 },
  css: ['~/assets/css/tokens.css', '~/assets/css/global.css'],
  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET || 'dev-secret-change-me-please-32-bytes-min',
    reservedSlugs: process.env.NUXT_RESERVED_SLUGS || 'api,admin,dashboard,auth,login,register,pricing,help,docs,about,terms,privacy,blog,settings,billing,embed,assets,public,_nuxt,s',
    storage: {
      driver: process.env.STORAGE_DRIVER || 'local',
      localDir: process.env.LOCAL_UPLOAD_DIR || '.data/uploads'
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT || '',
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || '',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
      publicUrl: process.env.S3_PUBLIC_URL || ''
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || ''
    },
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:4200'
    }
  },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'quar.io — инструкции, которые работают',
      meta: [
        { charset: 'utf-8' },
        // viewport-fit=cover нужно для safe-area на iPhone с челкой/Dynamic Island
        { name: 'viewport', content: 'width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=yes' },
        { name: 'description', content: 'SaaS-платформа для размещения и редактирования инструкций к товарам.' },
        { name: 'theme-color', content: '#0039df' },
        { name: 'color-scheme', content: 'light' },
        // PWA-флаги
        { name: 'application-name', content: 'quar.io' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'quar.io' },
        { name: 'format-detection', content: 'telephone=no' },
        // Open Graph / соцсети
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'quar.io — инструкции, которые работают' },
        { property: 'og:description', content: 'SaaS-платформа для размещения и редактирования инструкций к товарам.' },
        { property: 'og:image', content: '/icons/icon-512.png' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:image', content: '/icons/icon-512.png' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://rsms.me' },
        { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
        // Favicons
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/icon-16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/icon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        // Apple touch icon — иконка на главном экране iOS
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
        // PWA manifest
        { rel: 'manifest', href: '/site.webmanifest' },
        // Apple splash screens (по media-query на размер устройства)
        // iPhone 14 Pro Max / 15 Pro Max / 16 Pro Max — 1290×2796
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-1290x2796.png',
          media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-2796x1290.png',
          media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        // iPhone 14 Pro / 15 / 15 Pro / 16 / 16 Pro — 1179×2556
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-1179x2556.png',
          media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-2556x1179.png',
          media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        // iPhone 12 Pro Max / 13 Pro Max / 14 Plus — 1284×2778
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-1284x2778.png',
          media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-2778x1284.png',
          media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        // iPhone 12 / 12 Pro / 13 / 13 Pro / 14 — 1170×2532
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-1170x2532.png',
          media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-2532x1170.png',
          media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        // iPhone X / Xs / 11 Pro / 12 mini / 13 mini — 1125×2436
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-1125x2436.png',
          media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-2436x1125.png',
          media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        // iPhone Xr / 11 — 828×1792
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-828x1792.png',
          media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-1792x828.png',
          media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        // iPhone 8 / SE2 / SE3 — 750×1334
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-750x1334.png',
          media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/iphone-1334x750.png',
          media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        // iPad Pro 12.9" — 2048×2732
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-2048x2732.png',
          media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-2732x2048.png',
          media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        // iPad Pro 11" — 1668×2388
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-1668x2388.png',
          media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-2388x1668.png',
          media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        // iPad Air 10.9" — 1640×2360
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-1640x2360.png',
          media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-2360x1640.png',
          media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        // iPad 10.2" — 1620×2160
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-1620x2160.png',
          media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-2160x1620.png',
          media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        // iPad mini 8.3" — 1488×2266
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-1488x2266.png',
          media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/ipad-2266x1488.png',
          media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' }
      ],
      script: [
        {
          key: 'yandex-metrika',
          type: 'text/javascript',
          innerHTML: `
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109158550', 'ym');

    ym(109158550, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
`
        }
      ],
      noscript: [
        {
          key: 'yandex-metrika-noscript',
          tagPosition: 'bodyClose',
          innerHTML: '<div><img src="https://mc.yandex.ru/watch/109158550" style="position:absolute; left:-9999px;" alt="" /></div>'
        }
      ]
    }
  },
  typescript: {
    strict: true
  },
  nitro: {
    experimental: {
      asyncContext: true
    }
  },
  
})
