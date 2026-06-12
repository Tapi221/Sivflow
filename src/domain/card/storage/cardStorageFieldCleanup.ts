type StorageLike = Record<string, unknown>;



const LEGACY_CARD_STORAGE_FIELDS = [
  "questionBlocks",
  "answerBlocks",
  "frontBlocks",
  "backBlocks",
  "questionText",
  "answerText",
  "questionImages",
  "answerImages",
  "questionAudios",
  "answerAudios",
  "questionCode",
  "answerCode",
  "questionMarked",
  "answerMarked",
  "questionTextHighlighted",
  "answerTextHighlighted",
  "inkQuestion",
  "inkAnswer",
  "questionExtraRows",
  "answerExtraRows",
  "question_extra_rows",
  "answer_extra_rows",
] as const;



const cleanupLegacyCardStorageFields = (record: StorageLike): StorageLike => {
  for (const field of LEGACY_CARD_STORAGE_FIELDS) {
    delete record[field];
  }

  return record;
};



export { cleanupLegacyCardStorageFields };
