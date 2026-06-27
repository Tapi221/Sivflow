/* eslint-disable */
// @ts-nocheck

type BuiltInTemplate = {
  name: string;
  type: 'template';
  preview: string;
  content: unknown;
};

type TemplateDefinition = {
  name: string;
  url: string;
};

const templateDefinitions = {
  Brainstorming: [
    { name: '5W2H', url: './edgeless/5W2H.json' },
    { name: 'Concept Map', url: './edgeless/Concept Map.json' },
    { name: 'Flowchart', url: './edgeless/Flowchart.json' },
    { name: 'SMART', url: './edgeless/SMART.json' },
    { name: 'SWOT', url: './edgeless/SWOT.json' },
  ],
  Marketing: [
    {
      name: '4P Marketing Matrix',
      url: './edgeless/4P Marketing Matrix.json',
    },
    { name: 'Storyboard', url: './edgeless/Storyboard.json' },
    { name: 'User Journey Map', url: './edgeless/User Journey Map.json' },
  ],
  Presentation: [
    { name: 'Business Proposal', url: './edgeless/Business Proposal.json' },
    { name: 'Data Analysis', url: './edgeless/Data Analysis.json' },
    { name: 'Simple Presentation', url: './edgeless/Simple Presentation.json' },
  ],
  'Project Management': [
    { name: 'Fishbone Diagram', url: './edgeless/Fishbone Diagram.json' },
    { name: 'Gantt Chart', url: './edgeless/Gantt Chart.json' },
    { name: 'Monthly Calendar', url: './edgeless/Monthly Calendar.json' },
    { name: 'Project Planning', url: './edgeless/Project Planning.json' },
    {
      name: 'Project Tracking Kanban',
      url: './edgeless/Project Tracking Kanban.json',
    },
  ],
};

const templateCache = new Map<string, Promise<BuiltInTemplate | null>>();

function lcs(text1: string, text2: string) {
  const dp: number[][] = Array.from({ length: text1.length + 1 })
    .fill(null)
    .map(() => Array.from<number>({ length: text2.length + 1 }).fill(0));

  for (let i = 1; i <= text1.length; i++) {
    for (let j = 1; j <= text2.length; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[text1.length][text2.length];
}

async function loadTemplate(definition: TemplateDefinition) {
  const cached = templateCache.get(definition.url);
  if (cached) {
    return cached;
  }

  const promise = fetch(new URL(definition.url, import.meta.url))
    .then(async response => {
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return (await response.json()) as BuiltInTemplate;
    })
    .catch(error => {
      console.warn(
        `[Sivflow] Edgelessテンプレート「${definition.name}」を読み込めないためスキップします: ${definition.url}`,
        error
      );
      return null;
    });

  templateCache.set(definition.url, promise);
  return promise;
}

async function loadTemplates(category: string) {
  const definitions = templateDefinitions[category] ?? [];
  const templates = await Promise.all(definitions.map(loadTemplate));
  return templates.filter(Boolean);
}

export const builtInTemplates = {
  list: async (category: string) => {
    return loadTemplates(category);
  },

  categories: async () => {
    return Object.keys(templateDefinitions);
  },

  search: async (query: string) => {
    const candidates: unknown[] = [];
    const cates = Object.keys(templateDefinitions);

    query = query.toLowerCase();

    for (let cate of cates) {
      const templatesOfCate = await loadTemplates(cate);

      for (let temp of templatesOfCate) {
        if (lcs(query, temp.name.toLowerCase()) === query.length) {
          candidates.push(temp);
        }
      }
    }

    return candidates;
  },
};
