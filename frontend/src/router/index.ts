import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DashboardView from '../views/DashboardView.vue'
import EntryDetailView from '../views/EntryDetailView.vue'
import AdminAccountsView from '../views/AdminAccountsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
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
  ],
})

export default router
