import { logger } from '../logger';

const CHALLENGE_BITS = 20;

type MintChallengeResponse = (
  resource: string,
  bits?: number | null
) => Promise<string>;

let nativeMintChallengeResponse: MintChallengeResponse | null | undefined;

async function loadNativeMintChallengeResponse() {
  if (nativeMintChallengeResponse === null) {
    return null;
  }

  if (!nativeMintChallengeResponse) {
    try {
      ({ mintChallengeResponse: nativeMintChallengeResponse } = await import(
        '@affine/native'
      ));
    } catch (err) {
      nativeMintChallengeResponse = null;
      logger.error(
        'ネイティブ依存の読み込みに失敗しました。node_modules を削除して npm install をやり直してください。',
        err
      );
      return null;
    }
  }

  return nativeMintChallengeResponse;
}

export const getChallengeResponse = async (resource: string) => {
  // 20 bits challenge は安全性と体感速度のバランスを取るための値。
  const mintChallengeResponse = await loadNativeMintChallengeResponse();

  if (!mintChallengeResponse) {
    throw new Error(
      'ネイティブ依存が不足しているため challenge を生成できません。node_modules を削除して npm install を実行してください。'
    );
  }

  return mintChallengeResponse(resource, CHALLENGE_BITS);
};
