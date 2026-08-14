import { hash, verify, Algorithm } from '@node-rs/argon2'
import { randomBytes } from 'node:crypto'

/**
 * Argon2id con parametros de trabajo deliberadamente altos: el login ocurre
 * una vez al dia, asi que ~100 ms de coste es irrelevante para el usuario y
 * encarece enormemente un ataque por fuerza bruta sobre el hash.
 */
const OPCIONES = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
}

export async function hashearSecreto(secreto: string): Promise<string> {
  return hash(secreto, OPCIONES)
}

export async function verificarSecreto(hashGuardado: string, secreto: string): Promise<boolean> {
  try {
    return await verify(hashGuardado, secreto, OPCIONES)
  } catch {
    // Un hash ilegible se trata como fallo de verificacion, nunca como exito.
    return false
  }
}

/** Codigo de recuperacion legible: 4 grupos de 5 caracteres sin simbolos ambiguos. */
export function generarCodigoRecuperacion(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(20)
  const grupos: string[] = []
  for (let g = 0; g < 4; g++) {
    let grupo = ''
    for (let i = 0; i < 5; i++) {
      grupo += alfabeto[bytes[g * 5 + i] % alfabeto.length]
    }
    grupos.push(grupo)
  }
  return grupos.join('-')
}

export function normalizarCodigo(codigo: string): string {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
