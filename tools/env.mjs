// 시험 공용 경로: 게임 파일과 화면 사진 폴더 (SHOT_DIR로 바꿀 수 있음)
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GAME = pathToFileURL(path.join(root, 'dist', 'index.html')).href;
export const SHOTS = (process.env.SHOT_DIR || path.join(root, 'shots')) + '/';
fs.mkdirSync(SHOTS, { recursive: true });
