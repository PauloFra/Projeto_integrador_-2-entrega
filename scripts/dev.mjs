#!/usr/bin/env node
/**
 * Sobe os dois servidores de desenvolvimento ao mesmo tempo, com a saída
 * identificada por prefixo e sem depender de pacotes externos.
 *
 *   api  -> http://localhost:3333
 *   web  -> http://localhost:5173
 *
 * Uso:  npm run dev     (Ctrl+C encerra os dois)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const bancoEsperado = path.join(raiz, 'backend', 'data', 'patas.db');
if (!fs.existsSync(bancoEsperado) && !fs.existsSync(path.join(raiz, 'backend', '.env'))) {
  console.log('\nO ambiente ainda não foi preparado. Rode primeiro:\n  npm run setup\n');
  process.exit(1);
}

const cores = { api: '\u001b[36m', web: '\u001b[35m', reset: '\u001b[0m' };

const processos = [];

const iniciar = (nome, argumentos) => {
  const filho = spawn('npm', argumentos, { cwd: raiz, shell: true });
  processos.push(filho);

  const imprimir = (bloco) => {
    bloco
      .toString()
      .split('\n')
      .filter((linha) => linha.trim() !== '')
      .forEach((linha) => console.log(`${cores[nome]}[${nome}]${cores.reset} ${linha}`));
  };

  filho.stdout.on('data', imprimir);
  filho.stderr.on('data', imprimir);
  filho.on('exit', (codigo) => {
    console.log(`${cores[nome]}[${nome}]${cores.reset} encerrado (código ${codigo}).`);
  });
};

iniciar('api', ['run', 'dev', '--workspace', 'backend']);
iniciar('web', ['run', 'dev', '--workspace', 'frontend']);

const encerrarTodos = () => {
  processos.forEach((filho) => {
    if (!filho.killed) filho.kill();
  });
  process.exit(0);
};

process.on('SIGINT', encerrarTodos);
process.on('SIGTERM', encerrarTodos);
