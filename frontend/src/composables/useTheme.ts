import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const theme = ref<Theme>('dark')

function applyTheme(value: Theme) {
  document.documentElement.classList.toggle('dark', value === 'dark')
  localStorage.setItem('theme', value)
}

export function initTheme() {
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved === 'light' || saved === 'dark') {
    theme.value = saved
  } else {
    theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  applyTheme(theme.value)
}

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(value: Theme) {
    theme.value = value
  }

  watch(theme, applyTheme)

  return { theme, toggleTheme, setTheme }
}
