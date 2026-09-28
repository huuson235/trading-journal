import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DashboardView from '../views/DashboardView.vue'
import EntryDetailView from '../views/EntryDetailView.vue'
import AdminAccountsView from '../views/AdminAccountsView.vue'
import NewsCalendarView from '../views/NewsCalendarView.vue'

/** Subdomain tin tức độc lập (vd: news.songroup.uk) — `/` chính là page news */
function isNewsHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return host === 'news.songroup.uk' || host.startsWith('news.')
}

const newsStandaloneRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'news',
    component: NewsCalendarView,
  },
  {
    path: '/news',
    redirect: '/',
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/news',
    name: 'news',
    component: NewsCalendarView,
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminAccountsView,
  },
  {
    path: '/u/:slug',
    name: 'journal',
    component: DashboardView,
  },
  {
    path: '/u/:slug/detail/:id',
    name: 'entry-detail',
    component: EntryDetailView,
  },
  {
    path: '/detail/:id',
    redirect: (to) => ({
      name: 'entry-detail',
      params: { slug: 'main', id: to.params.id },
    }),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: isNewsHost() ? newsStandaloneRoutes : appRoutes,
})

export default router
