export type ProjectEntry = {
  name: string;
  description: string;
  tech: string[];
  status: 'Active' | 'Complete' | 'Archived';
  url?: string;
};

export const projects: ProjectEntry[] = [
  // Add entries following this shape:
  // {
  //   name: 'Project Name',
  //   description: 'Brief description of what it does.',
  //   tech: ['React', 'Node.js', 'PostgreSQL'],
  //   status: 'Active',
  //   url: 'https://github.com/user/repo',
  // },
];
