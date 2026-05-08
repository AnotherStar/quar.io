#!/usr/bin/env ts-node
/**
 * ManualOnline Wiki — быстрое обновление одного модуля.
 *
 * Предназначен для вызова из CLAUDE.md / агентских хуков после изменения кода.
 *
 * Запуск:
 *   pnpm wiki:update -- <moduleName> [section]
 *
 * Примеры:
 *   pnpm wiki:update -- api-instructions server
 *   pnpm wiki:update -- dashboard client
 *   pnpm wiki:update -- warranty-registration modules
 */

import { spawnSync } from 'child_process';
import path from 'path';

const [, , moduleName, section] = process.argv;

if (!moduleName) {
    console.error('Использование: update-module.ts <moduleName> [server|client|shared|modules|data]');
    process.exit(1);
}

const args = ['generate.ts', '--module', moduleName, '--force'];
if (section) args.push('--section', section);

const result = spawnSync('npx', ['ts-node', ...args], {
    cwd: path.resolve(__dirname),
    stdio: 'inherit',
    env: process.env,
});

process.exit(result.status ?? 0);
