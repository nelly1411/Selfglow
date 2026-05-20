import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '../lib/utils'

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      defaultValue={defaultValue}
      className={cn(
        'relative flex w-full touch-none select-none items-center py-4',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow rounded-full bg-[#FFFFFF]">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[#D4A574]" />
      </SliderPrimitive.Track>

      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block h-6 w-6 cursor-grab rounded-full border-2 border-white bg-[#D4A574] shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4A574]/30 active:cursor-grabbing"
          aria-label={index === 0 ? 'Mindestpreis' : 'Maximalpreis'}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }