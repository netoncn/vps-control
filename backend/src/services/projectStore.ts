import fs from 'fs';
import path from 'path';
import { Project } from '../types';
import crypto from 'crypto';

const DATA_FILE = path.resolve(process.cwd(), 'data', 'projects.json');

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
}

export class ProjectStore {
  constructor() {
    ensureFile();
  }

  async list(): Promise<Project[]> {
    ensureFile();
    const raw = await fs.promises.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '[]');
    return parsed as Project[];
  }

  async save(projects: Project[]) {
    ensureFile();
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(projects, null, 2));
  }

  async create(name: string, containerIds: string[]): Promise<Project> {
    const projects = await this.list();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      containerIds,
      source: 'manual',
    };
    projects.push(project);
    await this.save(projects);
    return project;
  }

  async update(id: string, attrs: Partial<Pick<Project, 'name' | 'containerIds'>>): Promise<Project> {
    const projects = await this.list();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Project not found');
    projects[idx] = { ...projects[idx], ...attrs };
    await this.save(projects);
    return projects[idx];
  }

  async remove(id: string) {
    const projects = await this.list();
    const next = projects.filter((p) => p.id !== id);
    await this.save(next);
  }
}
