import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/Home.vue'),
    meta: { title: 'Home', subtitle: 'Overview' }
  },
  {
    path: '/images',
    name: 'images',
    component: () => import('@/pages/Images.vue'),
    meta: { title: 'Images', subtitle: 'Shift' }
  },
  {
    path: '/documents',
    name: 'documents',
    component: () => import('@/pages/Documents.vue'),
    meta: { title: 'Documents', subtitle: 'Coming Soon' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/Settings.vue'),
    meta: { title: 'Settings', subtitle: 'Preferences' }
  },
  {
    path: '/licenses',
    name: 'licenses',
    component: () => import('@/pages/Licenses.vue'),
    meta: { title: 'Licenses', subtitle: 'Open Source' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Update document title on route change
router.afterEach((to) => {
  const title = to.meta.title as string || 'Shifteo'
  document.title = `${title} — Shifteo`
})

export default router
