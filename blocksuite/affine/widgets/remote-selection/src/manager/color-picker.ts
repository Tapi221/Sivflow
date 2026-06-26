class RandomPicker<T> {
  private _copyArray: T[];

  private readonly _originalArray: T[];

  constructor(array: T[]) {
    this._originalArray = [...array];
    this._copyArray = [...array];
  }

  private randomIndex(max: number): number {
    return Math.floor(Math.random() * max);
  }

  pick(): T {
    if (this._copyArray.length === 0) {
      this._copyArray = [...this._originalArray];
    }

    const index = this.randomIndex(this._copyArray.length);
    const item = this._copyArray[index];
    this._copyArray.splice(index, 1);
    return item;
  }
}

export const multiPlayersColor = new RandomPicker([
  'var(--sivflow-multi-players-purple)',
  'var(--sivflow-multi-players-magenta)',
  'var(--sivflow-multi-players-red)',
  'var(--sivflow-multi-players-orange)',
  'var(--sivflow-multi-players-green)',
  'var(--sivflow-multi-players-blue)',
  'var(--sivflow-multi-players-brown)',
  'var(--sivflow-multi-players-grey)',
]);
