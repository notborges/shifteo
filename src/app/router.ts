import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { applyRouteSeo } from '@/app/seo'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/Home.vue'),
    meta: { title: 'Home', subtitle: 'Overview', seoKey: 'home' }
  },
  {
    path: '/images',
    name: 'images',
    component: () => import('@/pages/Images.vue'),
    meta: { title: 'Images', subtitle: 'Shift', seoKey: 'images' }
  },
  {
    path: '/documents',
    name: 'documents',
    component: () => import('@/pages/Documents.vue'),
    meta: { title: 'Documents', subtitle: 'PDF Tools', seoKey: 'documents' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/Settings.vue'),
    meta: { title: 'Settings', subtitle: 'Preferences', seoKey: 'settings' }
  },
  {
    path: '/licenses',
    name: 'licenses',
    component: () => import('@/pages/Licenses.vue'),
    meta: { title: 'Licenses', subtitle: 'Open Source', seoKey: 'licenses' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.afterEach((to) => {
  applyRouteSeo(to)
})

applyRouteSeo(router.currentRoute.value)

export default router
