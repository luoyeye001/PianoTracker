declare module '@theme-toggles/react' {
  import type { ButtonHTMLAttributes, Dispatch, ForwardRefExoticComponent, RefAttributes, SetStateAction } from 'react'

  export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
    toggled?: boolean
    toggle?: Dispatch<SetStateAction<boolean>>
    duration?: number
    reversed?: boolean
    onToggle?: (toggled: boolean) => void
  }

  export const Classic: ForwardRefExoticComponent<ToggleProps & RefAttributes<HTMLButtonElement>>
}

declare module '@theme-toggles/react/css/Classic.css'
