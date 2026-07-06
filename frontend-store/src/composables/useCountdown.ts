import { computed, onMounted, onUnmounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

export function useCountdown(endsAt: MaybeRefOrGetter<string | null | undefined>) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined

  function tick() {
    now.value = Date.now()
  }

  onMounted(() => {
    timer = setInterval(tick, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  watch(
    () => toValue(endsAt),
    () => tick(),
  )

  const remaining = computed(() => {
    const end = toValue(endsAt)
    if (!end) return null
    const diff = Math.max(0, new Date(end).getTime() - now.value)
    return {
      hours: Math.floor(diff / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1000),
      expired: diff === 0,
    }
  })

  function pad(n: number) {
    return String(n).padStart(2, '0')
  }

  return { remaining, pad }
}
