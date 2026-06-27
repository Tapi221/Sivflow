/* eslint-disable */
// @ts-nocheck

const templates = {};
let warnedMissingTemplates = false;

function warnMissingTemplates() {
  if (warnedMissingTemplates) {
    return;
  }

  warnedMissingTemplates = true;
  console.warn(
    '[Sivflow] Edgelessテンプレートが未生成のため、組み込みテンプレートを空として扱います。必要な場合は @affine/templates の build を実行してください。'
  );
}

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

export const builtInTemplates = {
  list: async (category: string) => {
    warnMissingTemplates();
    return templates[category] ?? [];
  },

  categories: async () => {
    return Object.keys(templates);
  },

  search: async (query: string) => {
    warnMissingTemplates();
    const candidates: unknown[] = [];
    const cates = Object.keys(templates);

    query = query.toLowerCase();

    for (let cate of cates) {
      const templatesOfCate = templates[cate];

      for (let temp of templatesOfCate) {
        if (lcs(query, temp.name.toLowerCase()) === query.length) {
          candidates.push(temp);
        }
      }
    }

    return candidates;
  },
};
