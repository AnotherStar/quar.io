// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt'],
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
      model: process.env.OPENAI_MODEL || 'gpt-5-mini'
    },
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:4200'
    }
  },
  app: {
    head: {
      title: 'ManualOnline — инструкции, которые работают',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width,initial-scale=1' },
        { name: 'description', content: 'SaaS-платформа для размещения и редактирования инструкций к товарам.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://rsms.me' },
        { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' }
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
