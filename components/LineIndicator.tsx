import { LINE_COLORS } from '@/lib/constants'

interface LineIndicatorProps {
  line: string
  size?: 'sm' | 'md'
}

export default function LineIndicator({ line, size = 'md' }: LineIndicatorProps) {
  const colors = LINE_COLORS[line] ?? { bg: '#555', text: '#fff', name: line }
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold tracking-wide ${sizeClass}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
      title={`${colors.name} Line`}
    >
      {line}
    </span>
  )
}
