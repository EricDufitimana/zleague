declare module '@tabler/icons-react' {
  import { ForwardRefExoticComponent, SVGProps } from 'react'
  
  export type Icon = ForwardRefExoticComponent<
    Omit<SVGProps<SVGSVGElement>, 'ref'> & {
      size?: string | number
      stroke?: string | number
    }
  >
  
  export const IconHome: Icon
  export const IconChartBar: Icon
  export const IconTrophy: Icon
  export const IconCalendar: Icon
  export const IconUsers: Icon
  export const IconSettings: Icon
  export const IconLogout: Icon
}

