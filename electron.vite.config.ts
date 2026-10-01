import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Semilla con la que se firman los codigos de activacion. Vive en
 * publicador/semilla.txt, que esta fuera de git: este repositorio es publico y
 * con la semilla a la vista cualquiera podria generar codigos validos.
 * Sin el archivo se compila con una semilla de desarrollo, que no sirve para
 * los codigos entregados a clientes.
 */
function semillaActivacion(): string {
  const ruta = resolve('publicador/semilla.txt')
  if (existsSync(ruta)) {
    const valor = readFileSync(ruta, 'utf8').trim()
    if (valor) return valor
  }
  console.warn('[DMedic] Falta publicador/semilla.txt: se compila con la semilla de desarrollo.')
  return 'DMedic::desarrollo::semilla-sin-valor'
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __SEMILLA_ACTIVACION__: JSON.stringify(semillaActivacion())
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main': resolve('src/main')
      }
    },
    build: {
      rollupOptions: {
        // El banco de pruebas se compila aparte para poder ejecutarlo con Electron
        // contra el codigo real, sin abrir la ventana de la aplicacion.
        input: {
          index: resolve('src/main/index.ts'),
          verificar: resolve('src/main/verificar.ts'),
          'verificar-expediente': resolve('src/main/verificar-expediente.ts'),
          'sembrar-demo': resolve('src/main/sembrar-demo.ts'),
          'verificar-licencia': resolve('src/main/verificar-licencia.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@renderer': resolve('src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    }
  }
})
