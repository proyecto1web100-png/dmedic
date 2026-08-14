import type { ApiDMedic } from './index'

declare global {
  interface Window {
    dmedic: ApiDMedic
  }
}

export {}
