import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { applyRouteSeo } from '@/app/seo'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/Home.vue'),
    meta: { seoKey: 'home' }
  },
  {
    path: '/licenses',
    name: 'licenses',
    component: () => import('@/pages/Licenses.vue'),
    meta: { seoKey: 'licenses' }
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/pages/Privacy.vue'),
    meta: { seoKey: 'privacy' }
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
